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

    stage('Push Docker Images to Docker Hub') {
    steps {
        withCredentials([usernamePassword(credentialsId: 'docker-hub-cred', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
            script {
                bat """
                    echo ${DOCKER_PASS} | docker login -u ${DOCKER_USER} --password-stdin
                    docker push ${DOCKER_USERNAME}/todo-frontend:${BUILD_TAG}
                    docker push ${DOCKER_USERNAME}/todo-backend:${BUILD_TAG}
                """
            }
        }
    }
}

        
        stage('Deploy to Kubernetes') {
            steps {
                withKubeConfig([credentialsId: 'kubernetes-config']) {
                    script {
                        sh """
                            sed -i 's|\${DOCKER_USERNAME}|${DOCKER_USERNAME}|g' k8s/frontend/deployment.yaml
                            sed -i 's|\${BUILD_TAG}|${BUILD_TAG}|g' k8s/frontend/deployment.yaml
                            sed -i 's|\${DOCKER_USERNAME}|${DOCKER_USERNAME}|g' k8s/backend/deployment.yaml
                            sed -i 's|\${BUILD_TAG}|${BUILD_TAG}|g' k8s/backend/deployment.yaml
                            
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
            sh "docker system prune -f"
        }
    }
}
