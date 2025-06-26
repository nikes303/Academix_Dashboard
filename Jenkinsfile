pipeline {
    agent any

    tools {
        // Ensure you have a NodeJS installation named 'NodeJS-18' in Jenkins > Tools
        nodejs 'NodeJS-20' 
    }

    environment {
        // Your existing environment variables are correct
        DOCKERHUB_USERNAME     = 'nikes303' 
        DOCKERHUB_CREDENTIALS_ID = 'dockerhub-creds' 
        NETLIFY_AUTH_TOKEN     = credentials('netlify-token') 
        NETLIFY_SITE_ID        = '6db5da3e-b2db-4a4f-be5b-f1e56887f500' 
        RENDER_DEPLOY_HOOK_URL = credentials('render-hook') 
        IMAGE_NAME             = "${DOCKERHUB_USERNAME}/academix-dashboard"
    }

    stages {
        stage('Git Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/nikes303/Academix_Dashboard.git'
            }
        }

        stage('Install Backend Dependencies') {
            steps {
                dir('backend') {
                    // CORRECTED: Changed sh to bat
                    bat 'npm install'
                }
            }
        }

        stage('OWASP Dependency-Check') {
            steps {
                dependencyCheck additionalArguments: '--scan . --format XML --prettyPrint', odcInstallation: 'DP'
                dependencyCheckPublisher pattern: 'dependency-check-report.xml'
            }
        }

        stage('Build & Push Backend Docker Image') {
            steps {
                script {
                    def image = docker.build("${IMAGE_NAME}:${BUILD_NUMBER}", ".")
                    docker.withRegistry('https://registry.hub.docker.com', DOCKERHUB_CREDENTIALS_ID) {
                        image.push()
                        image.push("latest")
                    }
                }
            }
        }
        
        stage('Trivy Docker Image Scan') {
            steps {
                // CORRECTED: Changed sh to bat
                bat "trivy image --exit-code 0 --severity HIGH,CRITICAL ${IMAGE_NAME}:${BUILD_NUMBER}"
            }
        }
        
        stage('Trigger Backend Deploy on Render') {
            steps {
                // The 'curl' command is available on modern Windows, so 'bat' works here
                echo 'Sending deploy signal to Render...'
                bat "curl -X POST ${RENDER_DEPLOY_HOOK_URL}"
            }
        }
        
        stage('Deploy Frontend to Netlify') {
            steps {
                // CORRECTED: Changed sh to bat
                bat 'npm install -g netlify-cli'
                echo 'Deploying frontend to Netlify...'
                bat "netlify deploy --dir=frontend --prod --site=${NETLIFY_SITE_ID} --auth=${NETLIFY_AUTH_TOKEN}"
            }
        }
    }
    
    post {
        always {
            echo 'Pipeline has finished.'
            cleanWs()
        }
    }
}
