pipeline {
    agent any

    environment {
        DOCKER_USERNAME = 'rushikesh151999' // Docker Hub username
        DOCKER_REGISTRY = 'docker.io' // Docker Hub registry
        DOCKER_CREDENTIALS = credentials('docker-hub-cred') // Jenkins credentials for Docker Hub
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

        stage('Push Docker Images') {
            steps {
                script {
                    // Log in to Docker Hub using Jenkins credentials
                    withCredentials([usernamePassword(credentialsId: 'docker-hub-cred', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                        bat "echo ${DOCKER_PASSWORD} | docker login -u ${DOCKER_USERNAME} --password-stdin"
                    }

                    // Push images to Docker Hub
                    bat "docker push ${DOCKER_USERNAME}/todo-frontend:${BUILD_TAG}"
                    bat "docker push ${DOCKER_USERNAME}/todo-backend:${BUILD_TAG}"
                }
            }
        }
        
        stage('Update Kubernetes Deployment') {
    steps {
        script {
            // Replace image names in deployment.yaml for both frontend and backend
            powershell """
                # Replace backend image with the correct tag
                (Get-Content k8s/backend/deployment.yaml) -replace '${DOCKER_REGISTRY}/todo-backend:.*', '${DOCKER_USERNAME}/todo-backend:${BUILD_TAG}' | Set-Content k8s/backend/deployment.yaml
                
                # Replace frontend image with the correct tag
                (Get-Content k8s/frontend/deployment.yaml) -replace '${DOCKER_REGISTRY}/todo-frontend:.*', '${DOCKER_USERNAME}/todo-frontend:${BUILD_TAG}' | Set-Content k8s/frontend/deployment.yaml
                
                # Debug: Print updated files
                Write-Host "Updated backend deployment YAML"
                Get-Content k8s/backend/deployment.yaml
                Write-Host "Updated frontend deployment YAML"
                Get-Content k8s/frontend/deployment.yaml
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
                    bat '''
                        kubectl apply -f k8s/monitoring/prometheus-configmap.yaml
                        kubectl apply -f k8s/monitoring/prometheus-deployment.yaml
                        kubectl apply -f k8s/monitoring/prometheus-service.yaml
                        kubectl apply -f k8s/monitoring/grafana-deployment.yaml
                        kubectl apply -f k8s/monitoring/grafana-service.yaml
                    '''
                }
            }
        }
    }

    post {
        always {
            // Remove old frontend images (excluding the current build)
            bat """
                docker images ${DOCKER_USERNAME}/todo-frontend --format "{{.Repository}}:{{.Tag}}" | ForEach-Object {
                    if ($_ -ne '${DOCKER_USERNAME}/todo-frontend:${BUILD_TAG}') {
                        docker rmi $_
                    }
                }
                
                // Remove old backend images (excluding the current build)
                docker images ${DOCKER_USERNAME}/todo-backend --format "{{.Repository}}:{{.Tag}}" | ForEach-Object {
                    if ($_ -ne '${DOCKER_USERNAME}/todo-backend:${BUILD_TAG}') {
                        docker rmi $_
                    }
                }
            """
        }

        success {
            bat 'echo "Pipeline completed successfully!"'
        }

        failure {
            bat '''
                echo "Pipeline failed! Cleaning up resources..."
                kubectl delete deployment todo-frontend --ignore-not-found=true
                kubectl delete deployment todo-backend --ignore-not-found=true
                kubectl delete deployment mysql --ignore-not-found=true
                kubectl delete service todo-frontend --ignore-not-found=true
                kubectl delete service todo-backend --ignore-not-found=true
                kubectl delete service mysql --ignore-not-found=true
            '''
        }
    }
}
