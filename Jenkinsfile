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
                        sh """
                            docker run --rm \
                            --volumes-from jenkins \
                            -w ${WORKSPACE}/services/report-service \
                            python:3.11-slim \
                            sh -c "pip install -r requirements.txt -q && pytest tests/ -v"
                        """
                    }
                }

                stage('user-service [Node]') {
                    steps {
                        sh """
                            docker run --rm \
                              --volumes-from jenkins \
                              -w ${WORKSPACE}/services/user-service \
                              node:18-alpine \
                              sh -c "npm install --silent && npm test"
                        """
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
    }
}