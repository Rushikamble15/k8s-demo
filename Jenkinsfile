pipeline {
    agent any
    
    environment {
        DOCKER_USERNAME = 'rushikesh151999' // Docker Hub username
        DOCKER_REGISTRY = 'docker.io' // Docker Hub registry
        DOCKER_CREDENTIALS = credentials('docker-hub-cred') // Docker Hub credentials
        KUBE_CONFIG = credentials('kubernetes-config') // Kubernetes credentials
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
        
        // stage('Push Docker Images to Docker Hub') {
        //     steps {
        //         withCredentials([usernamePassword(credentialsId: 'docker-hub-cred', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
        //             bat """
        //                 echo %DOCKER_PASS% | docker login -u %DOCKER_USER% --password-stdin
        //                 docker push %DOCKER_USER%/todo-frontend:%BUILD_TAG%
        //                 docker push %DOCKER_USER%/todo-backend:%BUILD_TAG%
        //             """
        //         }
        //     }
        // }
        
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
        
        stage('Deploy Monitoring') {
            steps {
                withKubeConfig([credentialsId: 'kubernetes-config']) {
                    bat """
                        kubectl apply -f k8s\\monitoring\\prometheus-configmap.yaml
                        kubectl apply -f k8s\\monitoring\\prometheus-deployment.yaml
                        kubectl apply -f k8s\\monitoring\\prometheus-service.yaml

                        kubectl apply -f k8s\\monitoring\\grafana-deployment.yaml
                        kubectl apply -f k8s\\monitoring\\grafana-service.yaml
                    """
                }
            }
        }
        
        stage('Cleanup Old Images and Pods') {
            steps {
                script {
                    // Clean up Docker images (keep only the latest one)
                    bat """
                        for /f "tokens=*" %%i in ('docker images ${DOCKER_USERNAME}/todo-frontend --format "{{.Tag}}" ^| sort /R ^| findstr /R ".*" ^| more +2') do docker rmi ${DOCKER_USERNAME}/todo-frontend:%%i
                        for /f "tokens=*" %%i in ('docker images ${DOCKER_USERNAME}/todo-backend --format "{{.Tag}}" ^| sort /R ^| findstr /R ".*" ^| more +2') do docker rmi ${DOCKER_USERNAME}/todo-backend:%%i
                    """
                    
                    // Clean up Kubernetes resources: Pods, Services, and Deployments
                    withKubeConfig([credentialsId: 'kubernetes-config']) {
                        bat """
                            kubectl delete pods --selector=app=todo-frontend --field-selector=status.phase=Succeeded
                            kubectl delete pods --selector=app=todo-backend --field-selector=status.phase=Succeeded
                            
                            kubectl delete deployments --selector=app=todo-frontend
                            kubectl delete deployments --selector=app=todo-backend
                            
                            kubectl delete services --selector=app=todo-frontend
                            kubectl delete services --selector=app=todo-backend
                        """
                    }
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
