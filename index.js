require('dotenv').config()
const { default: parse } = require('node-html-parser')
const fs = require('node:fs');

const outputDir = './output'

async function getAppPage(id) {
    var response = await fetch(`https://apps.apple.com/us/app/dressbarn/${id}`)
    if (!response.ok) {
        throw new Error('API Issue')
    }
    const html = await response.text()

    const dom = parse(html)

    const historyList = dom.querySelector('#shoebox-media-api-cache-apps').text
    const json = JSON.parse(historyList)

    // Only one key here
    const key = Object.keys(json)[0]
    const data = JSON.parse(json[key])
    const versionHistory = data.d[0].attributes.platformAttributes.ios.versionHistory
    let result = {}
    result['name'] = data.d[0].attributes.name
    result['versionHistory'] = [...versionHistory]
    return result
}

function lastUpdatedDate(filename) {
    if (fs.existsSync(filename)) {
        const { mtimeMs } = fs.statSync(filename)
        return mtimeMs
    }
    return undefined
}

function readData(filename) {
    const content = fs.readFileSync(filename)
    return content
}

function saveData(filename, content) {
    fs.writeFile(filename, content, err => {
        if (err) {
            console.error(err)
        }
    })
}

function prepareOutputCSV(outputDir, data) {
    const stream = fs.createWriteStream(`${outputDir}/${data.name}.csv`)
    for (let i = 0; i < data.versionHistory.length; i++) {
        stream.write(`"${data.name}","${data.versionHistory[i].versionDisplay}","${data.versionHistory[i].releaseDate}","${(data.versionHistory[i].releaseNotes || "").trim()}"\n`)
    }
    stream.end()
}

function prepareSummaryCSV(outputFile, data) {
    const stream = fs.createWriteStream(outputFile)
    for (let i = 0; i < data.length; i++) {
        stream.write(`"${data[i].join('","')}"\n`)
    }
    stream.end()
}

function determineAgeBetweenReleases(data) {
    let compareDate = Date.now()
    let results = []
    for (let i=0; i<data.versionHistory.length; i++) {
        let historicalDate = Date.parse(data.versionHistory[i].releaseTimestamp)
        let diff=(compareDate - historicalDate)/1000/60/60/24
        diff = Number((diff).toFixed())
        compareDate = historicalDate
        results.push(diff)
    }
    return results
}

(async () => {
    try {
        const app_ids = process.env.APP_IDS.split(',')
        const summary = []
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir)
        }
        for (let i = 0; i < app_ids.length; i++) {
            let filename = `${outputDir}/${app_ids[i]}.json`
            let data = undefined
            const lastChange = lastUpdatedDate(filename)
            if (lastChange && ((Date.now() - lastChange) / 1000 / 60 / 60 / 24 < 1)) {
                console.log(`Loading the data for ${app_ids[i]}`)
                data = JSON.parse(readData(filename))
            } else {
                console.log(`Retrieving the data for ${app_ids[i]}`)
                data = await getAppPage(app_ids[i])
                saveData(filename, JSON.stringify(data))
            }
            prepareOutputCSV(outputDir, data)
            summary.push([data.name].concat(determineAgeBetweenReleases(data)))
        }
        prepareSummaryCSV(`${outputDir}/summary.csv`, summary)
    } catch (e) {
        console.log(`Opps`)
        console.log(e)
    }
})();