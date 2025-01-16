pipeline {
    agent any

    environment {
        DOCKER_USERNAME = 'rushikesh151999'
        DOCKER_REGISTRY = 'docker.io'
        DOCKER_CREDENTIALS = credentials('docker-hub-cred')
        KUBE_CONFIG = credentials('kubernetes-config')
        BUILD_TAG = "v${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout Code') {
            steps {
                git branch: 'main',
                    changelog: false,
                    poll: false,
                    url: 'https://github.com/Rushikamble15/k8s-demo.git'
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
                    withCredentials([usernamePassword(
                        credentialsId: 'docker-hub-cred',
                        usernameVariable: 'DOCKER_USERNAME',
                        passwordVariable: 'DOCKER_PASSWORD'
                    )]) {
                        bat "echo ${DOCKER_PASSWORD} | docker login -u ${DOCKER_USERNAME} --password-stdin"
                    }

                    bat "docker push ${DOCKER_USERNAME}/todo-frontend:${BUILD_TAG}"
                    bat "docker push ${DOCKER_USERNAME}/todo-backend:${BUILD_TAG}"
                }
            }
        }

        stage('Update Kubernetes Deployment') {
            steps {
                script {
                    powershell """
                        \$backendYaml = Get-Content k8s/backend/deployment.yaml -Raw
                        \$backendUpdated = \$backendYaml -replace '\\$\\{DOCKER_REGISTRY\\}/todo-backend:\\$\\{BUILD_TAG\\}', '${DOCKER_USERNAME}/todo-backend:${BUILD_TAG}'
                        \$backendUpdated | Set-Content k8s/backend/deployment.yaml -Force

                        \$frontendYaml = Get-Content k8s/frontend/deployment.yaml -Raw
                        \$frontendUpdated = \$frontendYaml -replace '\\$\\{DOCKER_REGISTRY\\}/todo-frontend:\\$\\{BUILD_TAG\\}', '${DOCKER_USERNAME}/todo-frontend:${BUILD_TAG}'
                        \$frontendUpdated | Set-Content k8s/frontend/deployment.yaml -Force

                        Write-Host "Updated backend deployment YAML:"
                        Get-Content k8s/backend/deployment.yaml
                        Write-Host "Updated frontend deployment YAML:"
                        Get-Content k8s/frontend/deployment.yaml

                        if (Select-String -Path k8s/backend/deployment.yaml -Pattern '\\$\\{DOCKER_REGISTRY\\}|\\$\\{BUILD_TAG\\}') {
                            throw "Variable substitution failed in backend deployment"
                        }
                        if (Select-String -Path k8s/frontend/deployment.yaml -Pattern '\\$\\{DOCKER_REGISTRY\\}|\\$\\{BUILD_TAG\\}') {
                            throw "Variable substitution failed in frontend deployment"
                        }
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
            bat """
                docker images ${DOCKER_USERNAME}/todo-frontend --format "{{.Repository}}:{{.Tag}}" | ForEach-Object {
                    if ($_ -ne '${DOCKER_USERNAME}/todo-frontend:${BUILD_TAG}') {
                        docker rmi $_
                    }
                }
                
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
