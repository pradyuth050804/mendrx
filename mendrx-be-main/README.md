This repo contains the code for Spring Boot Application. 
This repo does not contain the directories related to Google Cloud SDK.

## To run the application & successfully call the Gemini API, follow the below steps:


Run below commands on terminal:
```bash
curl https://sdk.cloud.google.com | bash  
exec -l $SHELL 
gcloud init 
```


Then, Authenticate yourself & allow/disallow optional setteings as required.


Then, run the following command:
```bash
gcloud auth application-default login 
```

Authenticate with the Google Account again.

Now, you are all set to run the application locally.


## Backend Production Deployment Steps:
1. Open SSH.
2. Run:
```bash
sudo apt update
```
3. Install Java & then check installation:
```bash
sudo apt install openjdk-17-jdk
java -version
```
4. Run locally:
```bash
./mvnw clean package
```
5. Upload the JAR file on the SSH terminal & check:
```bash
ls -l
```
6. Move the file by creating a new dir:
```bash
sudo mkdir -p /opt/mendrx
#Change the ownership of the directory to your user
sudo chown $USER:$USER /opt/mendrx
#Set the correct permissions
sudo chmod 755 /opt/mendrx
#move your JAR file to this directory
sudo mv backend-0.0.1-SNAPSHOT.jar /opt/mendrx/
```
7. Edit /etc/systemd/system/springboot.service as necessary(Needed to set env variables), save & exit.
8. For enabling Supabase DB SSL, upload the certificate & move to secure location:
```bash
sudo mkdir -p /etc/ssl/certs/supabase
sudo mv ~/prod-ca-2021.crt /etc/ssl/certs/supabase/
#Set appropriate permissions
sudo chmod 644 /etc/ssl/certs/supabase/prod-ca-2021.crt
```
9. Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable springboot.service
sudo systemctl start springboot.service
```
10. Check the status of service:
```bash
sudo systemctl status springboot.service
```


Replacing the existng service:
1. Stop the currently running Spring Boot service:
```bash
sudo systemctl stop springboot.service
```
2. Navigate to the directory where your current JAR is located & backup (not necessary):
```bash
cd /opt/mendrx
sudo mv backend-0.0.1-SNAPSHOT.jar backend-0.0.1-SNAPSHOT.jar.backup
```
3. Uplaod & move new JAR:
```bash
sudo mv backend-0.0.1-SNAPSHOT.jar /opt/mendrx/backend-0.0.1-SNAPSHOT.jar
```
4. Ensure the new JAR file has the correct ownership and permissions:
```bash
sudo chown $USER:$USER /opt/mendrx/backend-0.0.1-SNAPSHOT.jar
sudo chmod 644 /opt/mendrx/backend-0.0.1-SNAPSHOT.jar
```
5. Reload the systemd daemon, Start the Spring Boot service with the new JAR & Check the status
```bash
sudo systemctl daemon-reload
sudo systemctl start springboot.service
sudo systemctl status springboot.service
```
6. If everything is working correctly, you can remove the backup of the old JAR:
```bash
sudo rm /opt/mendrx/your-application.jar.backup
```

To check logs:
```bash
sudo journalctl -u springboot.service -f
```


Setting up nginx:
1. Install & create file:
```bash
sudo apt update && sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/api.mendrx.in
```
2. Add content to file:
```bash
server {
    listen 80;
    server_name api.mendrx.in;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
3. Test Nignx config & reload if successful
```bash
sudo nginx -t
sudo systemctl reload nginx
```
4. Run Certbot to obtain and install the SSL certificate:
```bash
sudo certbot --nginx -d api.mendrx.in
```
5. Check updated content:
```bash
sudo nano /etc/nginx/sites-available/api.mendrx.in
```
It should be similar to:
```bash
server {
    server_name api.mendrx.in;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/api.mendrx.in/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/api.mendrx.in/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = api.mendrx.in) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name api.mendrx.in;
    return 404; # managed by Certbot
}
```
6. Test & Reload
```bash
sudo nginx -t
sudo systemctl reload nginx
```
## To replace parameters.csv & tracker.xlsx:
1. Upload the files
2. Move to right folder:
```bash
sudo mv parameters_1.csv /opt/mendrx/data/parameters/parameters_1.csv
```
```bash
sudo mv tracker_1.xlsx /opt/mendrx/data/tracker/tracker_1.xlsx
```
```bash
sudo mv lifestyle_recommendations_1.xlsx /opt/mendrx/data/lifestyle-rec/lifestyle_recommendations_1.xlsx
```
3. Restart the application:
```bash
sudo systemctl stop springboot.service
sudo systemctl daemon-reload
sudo systemctl enable springboot.service
sudo systemctl start springboot.service
```

CORS for buckets:
```bash
[
    {
        "origin": ["https://mendrx.in"],
        "method": ["GET", "HEAD", "OPTIONS"],
        "responseHeader": [
            "Content-Type", 
            "Content-Length", 
            "Content-Disposition",
            "Access-Control-Allow-Origin",
            "Access-Control-Allow-Credentials"
        ],
        "maxAgeSeconds": 3600
    }
]
```
```bash
gsutil cors set cors-mendrx.json gs://custom-signatures
gsutil cors get gs://custom-signatures   

```







