pipeline {
    agent any
    
    environment {
        DOCKER_USERNAME = 'rushikesh151999' // Docker Hub username
        DOCKER_REGISTRY = 'docker.io' // Docker Hub registry
        DOCKER_CREDENTIALS = 'docker-hub-cred' // Jenkins credentials for Docker Hub
        KUBE_CONFIG = credentials('kubernetes-config') // Kubernetes config for kubectl
        BUILD_TAG = "v${BUILD_NUMBER}" // Automatically assigned version tag
    }
    
    stages {
        stage('Checkout Code') {
            steps {
               git branch: 'main', changelog: false, poll: false, url: 'https://github.com/Rushikamble15/k8s-demo.git'
            }
        }
        
    stage('Build Docker Images') {
    parallel {
        stage('Build Frontend') {
            steps {
                dir('frontend/todolist') {
                    bat "docker build -t ${DOCKER_USERNAME}/todo-frontend:${BUILD_TAG} ."
                }
            }
        }
        
        stage('Build Backend') {
            steps {
                dir('backend') {
                    bat "docker build -t ${DOCKER_USERNAME}/todo-backend:${BUILD_TAG} ."
                }
            }
        }
    }
}

        stage('Test Docker Access') {
    steps {
        bat 'docker --version'
    }
}


  stage("Push To DockerHub") {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-hub-cred', // Reference your Docker Hub credentials
                    usernameVariable: 'dockerHubUser', // The username variable
                    passwordVariable: 'dockerHubPass')]) { // The password variable
                    
                    // Docker login to Docker Hub
                    bat "echo $dockerHubPass | docker login -u $dockerHubUser --password-stdin"
                    
                    // Tag and push frontend image
                    bat "docker image tag ${DOCKER_USERNAME}/todo-frontend:${BUILD_TAG} ${dockerHubUser}/todo-frontend:${BUILD_TAG}"
                    bat "docker push ${dockerHubUser}/todo-frontend:${BUILD_TAG}"
                    
                    // Tag and push backend image
                    bat "docker image tag ${DOCKER_USERNAME}/todo-backend:${BUILD_TAG} ${dockerHubUser}/todo-backend:${BUILD_TAG}"
                    bat "docker push ${dockerHubUser}/todo-backend:${BUILD_TAG}"
                }
            }
        }
        
        
         stage('Update Kubernetes Deployment') {
            steps {
                script {
                    // Replace ${DOCKER_REGISTRY} and ${BUILD_TAG} in the Kubernetes YAML files using PowerShell
                    powershell """
                        (Get-Content k8s/backend/deployment.yaml) -replace '${DOCKER_REGISTRY}/todo-backend:.*', '${DOCKER_USERNAME}/todo-backend:${BUILD_TAG}' | Set-Content k8s/backend/deployment.yaml
                        (Get-Content k8s/frontend/deployment.yaml) -replace '${DOCKER_REGISTRY}/todo-frontend:.*', '${DOCKER_USERNAME}/todo-frontend:${BUILD_TAG}' | Set-Content k8s/frontend/deployment.yaml
                    """
                }
            }
        }


        
       stage('Deploy to Kubernetes') {
            steps {
                withKubeConfig([credentialsId: 'kubernetes-config']) {
                    script {
                        bat """
                            powershell -Command "(Get-Content k8s/frontend/deployment.yaml) -replace '\\\${DOCKER_USERNAME}', '${DOCKER_USERNAME}' | Set-Content k8s/frontend/deployment.yaml"
                            powershell -Command "(Get-Content k8s/frontend/deployment.yaml) -replace '\\\${BUILD_TAG}', '${BUILD_TAG}' | Set-Content k8s/frontend/deployment.yaml"
                            powershell -Command "(Get-Content k8s/backend/deployment.yaml) -replace '\\\${DOCKER_USERNAME}', '${DOCKER_USERNAME}' | Set-Content k8s/backend/deployment.yaml"
                            powershell -Command "(Get-Content k8s/backend/deployment.yaml) -replace '\\\${BUILD_TAG}', '${BUILD_TAG}' | Set-Content k8s/backend/deployment.yaml"
                            
                            kubectl apply -f k8s/mysql/secret.yaml
                            kubectl apply -f k8s/mysql/deployment.yaml
                            kubectl apply -f k8s/mysql/service.yaml
                            kubectl apply -f k8s/backend/deployment.yaml
                            kubectl apply -f k8s/backend/service.yaml
                            kubectl apply -f k8s/frontend/deployment.yaml
                            kubectl apply -f k8s/frontend/service.yaml
                        """
                    }
                }
            }
        }
        
        stage('Deploy Monitoring') {
            steps {
                withKubeConfig([credentialsId: 'kubernetes-config']) {
                    sh """
                        kubectl apply -f k8s/monitoring/prometheus-configmap.yaml
                        kubectl apply -f k8s/monitoring/prometheus-deployment.yaml
                        kubectl apply -f k8s/monitoring/prometheus-service.yaml

                        kubectl apply -f k8s/monitoring/grafana-deployment.yaml
                        kubectl apply -f k8s/monitoring/grafana-service.yaml
                    """
                }
            }
        }
        
        stage('Cleanup Old Images') {
            steps {
                script {
                    sh """
                        docker images ${DOCKER_USERNAME}/todo-frontend --format "{{.Tag}}" | sort -r | tail -n +3 | xargs -I {} docker rmi ${DOCKER_USERNAME}/todo-frontend:{}
                        docker images ${DOCKER_USERNAME}/todo-backend --format "{{.Tag}}" | sort -r | tail -n +3 | xargs -I {} docker rmi ${DOCKER_USERNAME}/todo-backend:{}
                    """
                }
            }
        }
    }
    
post {
        always {
            bat """
                docker images ${DOCKER_USERNAME}/todo-frontend:${BUILD_TAG} --format "{{.Repository}}:{{.Tag}}" | ForEach-Object { docker rmi $_ }
                docker images ${DOCKER_USERNAME}/todo-backend:${BUILD_TAG} --format "{{.Repository}}:{{.Tag}}" | ForEach-Object { docker rmi $_ }
            """
        }
    }
}

