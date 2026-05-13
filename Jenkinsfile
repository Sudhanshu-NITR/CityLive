pipeline {
    agent any

    environment {
        DOCKER_USER         = "sudh1804"   
        REPORT_SERVICE_IMG  = "${DOCKER_USER}/citylive-report-service"
        USER_SERVICE_IMG    = "${DOCKER_USER}/citylive-user-service"
        EVENT_SERVICE_IMG   = "${DOCKER_USER}/citylive-event-service"
        API_GATEWAY_IMG     = "${DOCKER_USER}/citylive-api-gateway"
        FRONTEND_IMG        = "${DOCKER_USER}/citylive-frontend"
        SONAR_URL           = "http://sonarqube:9000"
        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages{
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Test') {
            parallel {
                stage('report-service [pytest]') {
                    steps {
                        sh '''
                            docker run --rm \
                            --volumes-from jenkins \
                            -w ${WORKSPACE}/services/report-service \
                            python:3.11-slim \
                            sh -c "pip install -r requirements.txt -q && pytest tests/ -v"
                        '''
                    }
                }

                stage('user-service [Node]') {
                    steps {
                        sh '''
                            docker run --rm \
                            --volumes-from jenkins \
                            -w ${WORKSPACE}/services/user-service \
                            node:18-alpine \
                            sh -c "npm install --silent && npm test"
                        '''
                    }
                }

                stage('event-service [Go]') {
                    steps {
                        sh '''
                            docker run --rm \
                            --volumes-from jenkins \
                            -w ${WORKSPACE}/services/event-service \
                            golang:1.22-alpine \
                            go test ./...
                        '''
                    }
                }

                stage('api-gateway [Go]') {
                    steps {
                        sh '''
                            docker run --rm \
                            --volumes-from jenkins \
                            -w ${WORKSPACE}/services/api-gateway \
                            golang:1.22-alpine \
                            go test ./...
                        '''
                    }
                }

                stage('frontend [ESLint]') {
                    steps {
                        sh '''
                            docker run --rm \
                            --volumes-from jenkins \
                            -w ${WORKSPACE}/frontend \
                            node:18-alpine \
                            sh -c "npm install --silent && npm run lint"
                        '''
                    }
                }
            }
        }

        stage('Static Code Analysis') {
            steps {
                withCredentials([string(credentialsId: 'sonarqube', variable: 'SONAR_AUTH_TOKEN')]) {
                    sh '''
                        docker run --rm \
                        --volumes-from jenkins \
                        --network cicd-net \
                        -w ${WORKSPACE} \
                        -e SONAR_HOST_URL=${SONAR_URL} \
                        -e SONAR_TOKEN=${SONAR_AUTH_TOKEN} \
                        sonarsource/sonar-scanner-cli \
                        -Dsonar.projectKey=citylive \
                        -Dsonar.sources=services,frontend \
                        -Dsonar.exclusions=**/node_modules/**,**/.next/**,**/venv/**,**/__pycache__/**,**/.pytest_cache/**
                    '''
                }
            }
        }

        stage('Build & Push Docker Images') {
            parallel {

                stage('report-service') {
                    steps {
                        script {
                            def img = docker.build("${REPORT_SERVICE_IMG}:${IMAGE_TAG}", "services/report-service")
                            docker.withRegistry('https://index.docker.io/v1/', 'docker-cred') {
                                img.push()
                                img.push('latest')
                            }
                        }
                    }
                }

                stage('user-service') {
                    steps {
                        script {
                            def img = docker.build("${USER_SERVICE_IMG}:${IMAGE_TAG}", "services/user-service")
                            docker.withRegistry('https://index.docker.io/v1/', 'docker-cred') {
                                img.push()
                                img.push('latest')
                            }
                        }
                    }
                }

                stage('event-service') {
                    steps {
                        script {
                            def img = docker.build("${EVENT_SERVICE_IMG}:${IMAGE_TAG}", "services/event-service")
                            docker.withRegistry('https://index.docker.io/v1/', 'docker-cred') {
                                img.push()
                                img.push('latest')
                            }
                        }
                    }
                }

                stage('api-gateway') {
                    steps {
                        script {
                            def img = docker.build("${API_GATEWAY_IMG}:${IMAGE_TAG}", "services/api-gateway")
                            docker.withRegistry('https://index.docker.io/v1/', 'docker-cred') {
                                img.push()
                                img.push('latest')
                            }
                        }
                    }
                }

                stage('frontend') {
                    steps {
                        script {
                            def img = docker.build("${FRONTEND_IMG}:${IMAGE_TAG}", "frontend")
                            docker.withRegistry('https://index.docker.io/v1/', 'docker-cred') {
                                img.push()
                                img.push('latest')
                            }
                        }
                    }
                }
            }
        }

        stage('Update Manifests') {
            environment {
                GIT_REPO_NAME = "citylive-gitops"
                GIT_USER_NAME = "Sudhanshu-NITR"
                GIT_USER_EMAIL = "sudhanshu.kadam.99@gmail.com"
            }
            steps {
                withCredentials([string(credentialsId: 'github', variable: 'GITHUB_TOKEN')]) {
                    sh '''
                        git config user.email "${GIT_USER_EMAIL}"
                        git config user.name "${GIT_USER_NAME}"

                        # Update image tags in all deployment manifests
                        sed -i "s|${REPORT_SERVICE_IMG}:.*|${REPORT_SERVICE_IMG}:${IMAGE_TAG}|g" k8s/report-service/deployment.yml
                        sed -i "s|${USER_SERVICE_IMG}:.*|${USER_SERVICE_IMG}:${IMAGE_TAG}|g"     k8s/user-service/deployment.yml
                        sed -i "s|${EVENT_SERVICE_IMG}:.*|${EVENT_SERVICE_IMG}:${IMAGE_TAG}|g"   k8s/event-service/deployment.yml
                        sed -i "s|${API_GATEWAY_IMG}:.*|${API_GATEWAY_IMG}:${IMAGE_TAG}|g"       k8s/api-gateway/deployment.yml
                        sed -i "s|${FRONTEND_IMG}:.*|${FRONTEND_IMG}:${IMAGE_TAG}|g"             k8s/frontend/deployment.yml

                        git add k8s/
                        git commit -m "ci: update image tags to build ${IMAGE_TAG} [skip ci]"
                        git push https://${GITHUB_TOKEN}@github.com/${GIT_USER_NAME}/${GIT_REPO_NAME} HEAD:main
                    '''
                }
            }
        }
    }
}