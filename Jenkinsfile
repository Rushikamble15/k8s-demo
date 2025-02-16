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
                script {
                    // Log in to Docker Hub
                    withCredentials([usernamePassword(credentialsId: 'docker-hub-cred', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                        bat "echo ${DOCKER_PASSWORD} | docker login -u ${DOCKER_USERNAME} --password-stdin"
                    }

                    // Push images to Docker Hub
                    bat "docker push ${DOCKER_USERNAME}/todo-frontend:${BUILD_TAG}"
                    bat "docker push ${DOCKER_USERNAME}/todo-backend:${BUILD_TAG}"

                      // Capture pushed image details in environment variables
                    env.FRONTEND_IMAGE = "${DOCKER_USERNAME}/todo-frontend:${BUILD_TAG}"
                    env.BACKEND_IMAGE = "${DOCKER_USERNAME}/todo-backend:${BUILD_TAG}"
             // Echo the values of the environment variables to verify
                    echo "Frontend image: ${env.FRONTEND_IMAGE}"
                    echo "Backend image: ${env.BACKEND_IMAGE}"
                }
            }
        }

//         stage('Update Kubernetes Deployment') {
//             steps {
//                 script {
//                     // Verify the environment variables again using echo
//                     echo "Frontend image in Update stage: ${env.FRONTEND_IMAGE}"
//                     echo "Backend image in Update stage: ${env.BACKEND_IMAGE}"

//                     // Replace placeholders in Kubernetes YAML files using PowerShell
//                    powershell """
//     # Set the variables explicitly for PowerShell
//     \$DOCKER_USERNAME = '${env.DOCKER_USERNAME}'
//     \$BUILD_TAG = '${env.BUILD_TAG}'

//     # Replace image in the YAML files
//     (Get-Content k8s/frontend/deployment.yaml) -replace 'docker.io/todo-frontend:.*', '\$DOCKER_USERNAME/todo-frontend:\$BUILD_TAG' | Set-Content k8s/frontend/deployment.yaml
//     (Get-Content k8s/backend/deployment.yaml) -replace 'docker.io/todo-backend:.*', '\$DOCKER_USERNAME/todo-backend:\$BUILD_TAG' | Set-Content k8s/backend/deployment.yaml

//     # Debug: Output the updated YAML files to verify the changes
//     Write-Host "Updated Frontend Deployment YAML:"
//     Get-Content k8s/frontend/deployment.yaml

//     Write-Host "Updated Backend Deployment YAML:"
//     Get-Content k8s/backend/deployment.yaml
// """


//                 }
//             }
//         }



    stage('Deploy to Kubernetes') {
        steps {
            withKubeConfig([credentialsId: 'kubernetes-config']) {
                script {
                    // Debug: Check directory contents
                    bat 'dir k8s\\mysql'
                    
                    try {
                        // MySQL Dependencies
                        bat """
                            echo "Applying MySQL resources..."
                            kubectl apply -f k8s/mysql/mysql-secret.yaml  || echo "Failed to create mysql-secret"
                            kubectl apply -f k8s/mysql/mysql-pvc.yaml
                            kubectl apply -f k8s/mysql/mysql-init-script.yaml
                            kubectl apply -f k8s/mysql/deployment.yaml
                            kubectl apply -f k8s/mysql/service.yaml
                            
                            echo "Verifying MySQL resources..."
                            kubectl get configmap mysql-init-script
                            kubectl get pvc mysql-pvc
                            kubectl get secret mysql-secret
                            
                            echo "Waiting for MySQL pod..."
                            kubectl wait --for=condition=ready pod -l app=mysql --timeout=60s
                            
                            echo "Applying Backend resources..."
                            kubectl apply -f k8s/backend/deployment.yaml
                            kubectl apply -f k8s/backend/service.yaml
                            
                            echo "Applying Frontend resources..."
                            kubectl apply -f k8s/frontend/deployment.yaml
                            kubectl apply -f k8s/frontend/service.yaml
                        """
                    } catch (Exception e) {
                        echo "Deployment failed: ${e.getMessage()}"
                        
                        // Debug information on failure
                        bat """
                            echo "Debug Information:"
                            kubectl get pods
                            kubectl get configmap
                            kubectl get pvc
                            kubectl describe pod -l app=mysql
                        """
                        
                        error("Deployment failed")
                    }
                }
            }
        }
    }

      stage('Deploy Monitoring') {
            steps {
                withKubeConfig([credentialsId: 'kubernetes-config']) {
                   bat '''
                # Apply configurations in the correct order
                kubectl apply -f k8s/monitoring/prometheus-rbac.yaml
                kubectl apply -f k8s/monitoring/prometheus-configmap.yaml
                kubectl apply -f k8s/monitoring/prometheus-deployment.yaml
                kubectl apply -f k8s/monitoring/prometheus-service.yaml
                
                # Apply Grafana configurations
                kubectl apply -f k8s/monitoring/grafana-datasource.yaml
                kubectl apply -f k8s/monitoring/grafana-dashboards-provider.yaml
                kubectl apply -f k8s/monitoring/grafana-dashboards.yaml
                kubectl apply -f k8s/monitoring/grafana-deployment.yaml
                kubectl apply -f k8s/monitoring/grafana-service.yaml
                
                # Apply supporting monitoring components
                kubectl apply -f k8s/monitoring/kube-state-metrics.yaml
                kubectl apply -f k8s/monitoring/node-exporter.yaml
                
                # Wait for deployments
                kubectl rollout status deployment/grafana
                kubectl rollout status deployment/prometheus
            '''
                }
            }
        }
    }
    
      post {
        success {
            bat 'echo "Pipeline completed successfully!"'
        }
    }
}
