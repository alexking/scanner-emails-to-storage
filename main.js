#!/usr/bin/env node

const Yaml = require("node-yaml")
const Minio = require("minio")
const SMTPServer = require('smtp-server-as-promised')
const MailParser = require('mailparser').simpleParser
const NullWritable = require('null-writable')
const path = require("path")

// Load configuration
var config = Yaml.readSync("config.yaml");

// Setup the storage client (can attach to S3 or Minio)
var storage = new Minio.Client(config.storage)

// Setup the SMTP server so we can get emails 
var smtpServer = new SMTPServer({
    secure: true,
    logger: false,
    onData: async function(stream, session) {
        
        console.log("Incoming email...")

        try {

            // Try to parse the email 
            let email = await MailParser(stream)

            // If we have attachments, upload them to minio 
            if (email.attachments.length) {

                // For now grab the first one only 
                for (let file of email.attachments) {

                    // Filename should be the checksum of the file with the 
                    // extension from the filename 
                    let filename = file.checksum + path.extname(file.filename)

                    let upload = await storage.putObject(config.storage.bucket, filename, file.content, file.size, file.contentType)
                    console.log(" - stored " + file.filename + " to " + upload)

                }

            }

            return true

        } catch(e) {

            // Dump the stream if there's an issue 
            // https://www.npmjs.com/package/smtp-server-as-promised
            stream.pipe(new NullWritable)
            throw e 
        }

    },

    onAuth: async function(auth, session) {

        // Make sure the username/password we were sent match with config 
        if (auth.username === config.smtp.username 
            && auth.password === config.smtp.password) {
                return { user: auth.username }
            } 

        throw new Error("Invalid credentials")

    }
})

try {
    (async function main() {

        // Startup the SMTP server 
        await smtpServer.listen(config.smtp.port, "0.0.0.0")
        console.log("SMTP Server running on port " + config.smtp.port)

        // Ensure the bucket we're configured with exists 
        let bucket = await storage.bucketExists(config.storage.bucket)
        
        if (!bucket) {
            throw new Error("Bucket " + config.storage.bucket + " does not exist")
        }

        console.log("Storing any incoming attachments in '" + config.storage.bucket + "'")

    })()
} catch (e) {
    console.error(e)
    process.exit()
}



