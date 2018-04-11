## Scanner Emails to Storage

Several document scanners (such as the HP OfficeJet 8720) are able to send scans as attachments to an email address. This project runs an SMTP server that you can configure your scanner to use, which instead of delivering emails uploads the scanned attachment to object storage. 

Should work with any AWS S3 compatible object storage server, but it's only tested with Minio.

Minio and AWS both support notifications when files are added to storage so you can use those triggers to do something with the files as they arrive. 