pipeline {
    agent any

    environment {
        DOCKER_USERNAME = 'rushikesh151999' // Docker Hub username
        DOCKER_REGISTRY = 'docker.io' // Docker Hub registry
        DOCKER_CREDENTIALS = credentials('docker-hub-cred') // Jenkins credentials for Docker Hub
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

        stage('Login to Docker Hub') {
    steps {
        script {
            // Using 'withCredentials' to securely pass credentials without exposing them in logs
            withCredentials([usernamePassword(credentialsId: 'docker-hub-cred', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                bat """
                    echo ${DOCKER_PASSWORD} | docker login -u ${DOCKER_USERNAME} --password-stdin
                """
            }
        }
    }
}


        stage('Push Docker Images to Docker Hub') {
            parallel {
                stage('Push Frontend') {
                    steps {
                        script {
                            bat "docker push ${DOCKER_USERNAME}/todo-frontend:${BUILD_TAG}"
                        }
                    }
                }

                stage('Push Backend') {
                    steps {
                        script {
                            bat "docker push ${DOCKER_USERNAME}/todo-backend:${BUILD_TAG}"
                        }
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

        success {
            bat 'echo "Pipeline completed successfully!"'
        }

        failure {
            bat 'echo "Pipeline failed!"'
        }
    }
}
