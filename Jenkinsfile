pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = "localhost:5000"  // Local registry
        BUILD_TAG = "v${BUILD_NUMBER}"       // Jenkins build tag
        KUBE_CONFIG = credentials('kubernetes-config')
    }

   stages {
        stage('Checkout Code') {
            steps {
                git branch: 'main', changelog: false, poll: false, url: 'https://github.com/Rushikamble15/k8s-demo.git'
            }
        }


        stage('Build and Push Images') {
            parallel {
                stage('Frontend') {
                    steps {
                        dir('frontend/todolist') {
                            bat """
                                docker build -t ${DOCKER_REGISTRY}/todo-frontend:${BUILD_TAG} -t ${DOCKER_REGISTRY}/todo-frontend:latest .
                                docker push ${DOCKER_REGISTRY}/todo-frontend:${BUILD_TAG}
                                docker push ${DOCKER_REGISTRY}/todo-frontend:latest
                            """
                        }
                    }
                }

                stage('Backend') {
                    steps {
                        dir('backend') {
                            bat """
                                docker build -t ${DOCKER_REGISTRY}/todo-backend:${BUILD_TAG} -t ${DOCKER_REGISTRY}/todo-backend:latest .
                                docker push ${DOCKER_REGISTRY}/todo-backend:${BUILD_TAG}
                                docker push ${DOCKER_REGISTRY}/todo-backend:latest
                            """
                        }
                    }
                }
            }
        }

        stage('Update Kubernetes Manifests') {
            steps {
                script {
                    // Use powershell to replace placeholders with actual values in the YAML files
                    powershell """
                        (Get-Content k8s/backend/deployment.yaml) -replace 'image: .*', 'image: ${DOCKER_REGISTRY}/todo-backend:${BUILD_TAG}' | Set-Content k8s/backend/deployment.yaml
                        (Get-Content k8s/frontend/deployment.yaml) -replace 'image: .*', 'image: ${DOCKER_REGISTRY}/todo-frontend:${BUILD_TAG}' | Set-Content k8s/frontend/deployment.yaml
                    """
                }
            }
        }

        stage('Deploy Application') {
            steps {
                withKubeConfig([credentialsId: 'kubernetes-config']) {
                    bat """
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

        stage('Deploy Monitoring Stack') {
            steps {
                withKubeConfig([credentialsId: 'kubernetes-config']) {
                    bat """
                        kubectl apply -f k8s/monitoring/namespace.yaml
                        kubectl apply -f k8s/monitoring/prometheus-configmap.yaml
                        kubectl apply -f k8s/monitoring/prometheus-deployment.yaml
                        kubectl apply -f k8s/monitoring/prometheus-service.yaml
                        kubectl apply -f k8s/monitoring/grafana-deployment.yaml
                        kubectl apply -f k8s/monitoring/grafana-service.yaml
                        kubectl apply -f k8s/monitoring/kubernetes-dashboard.yaml
                    """
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                bat """
                    kubectl wait --for=condition=available deployment/todo-frontend --timeout=300s
                    kubectl wait --for=condition=available deployment/todo-backend --timeout=300s
                    kubectl wait --for=condition=available deployment/mysql --timeout=300s
                    kubectl wait --for=condition=available deployment/prometheus --timeout=300s -n monitoring
                    kubectl wait --for=condition=available deployment/grafana --timeout=300s -n monitoring
                """
            }
        }
    }

    post {
        success {
            bat """
                echo "Pipeline completed successfully!"
                echo "Access your applications at:"
                echo "Frontend: http://localhost:30080"
                echo "Backend: http://localhost:30081"
                echo "Grafana: http://localhost:30300"
                echo "Prometheus: http://localhost:30090"
                echo "Kubernetes Dashboard: http://localhost:30000"
            """
        }

        failure {
            bat """
                echo "Pipeline failed! Collecting diagnostics..."
                kubectl get pods -A
                kubectl describe pods -l app=todo-frontend
                kubectl describe pods -l app=todo-backend
                kubectl logs -l app=todo-frontend --tail=100
                kubectl logs -l app=todo-backend --tail=100
            """
        }

        always {
            // Cleanup local Docker images to save space
            bat """
                docker rmi ${DOCKER_REGISTRY}/todo-frontend:${BUILD_TAG} || true
                docker rmi ${DOCKER_REGISTRY}/todo-backend:${BUILD_TAG} || true
            """
        }
    }
}
