SHELL 			 := /bin/bash
BRANCH_NAME	 	 := $(shell git branch --show-current | sed -r 's/[/]+/_/g')
override VERSION := ${BRANCH_NAME}-${VER}
DOCKER_ORG   	 := helxplatform
DOCKER_TAG   	 := helx-ui:${VERSION}
BUILD_PATH   	 := ./build/frontend
TYCHO_BRANCH 	 := develop
TYCHO_PATH	 	 := ./tycho

.DEFAULT_GOAL = help

.PHONY: build clean help install lint publish test

.SILENT: clone.tycho

#help: List available tasks on this project
help:
	@grep -E '^#[a-zA-Z\.\-]+:.*$$' $(MAKEFILE_LIST) | tr -d '#' | awk 'BEGIN {FS = ": "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

init:
	git --version
	echo "Please make sure your git version is greater than 2.9.0. If it's not, this command will fail."
	git config --local core.hooksPath .githooks/

#build.npm: build project with npm
build.npm:
	echo "Building distribution packages"
	BUILD_PATH=$(BUILD_PATH) npm run build

#build.image: build project docker image
build.image:
	if [ -z "$(VER)" ]; then echo "Please provide a value for the VER variable like this:"; echo "make VER=4 build.image"; false; fi;
	echo "Building docker image: $(DOCKER_TAG)"
	docker build . --no-cache --pull -t $(DOCKER_ORG)/$(DOCKER_TAG)

#build: build project and image
build: build.npm build.image

#compose.appstore: run the appstore project with docker-compose
compose.appstore:
	echo "Setup .env first ex: cp .env.example .env"
	docker-compose -f docker-compose.appstore.yml pull && docker-compose -f docker-compose.appstore.yml up --remove-orphans

#compose.appstore-tycho: run appstore and tycho with docker-compose
compose.appstore-tycho: clone.tycho
	echo "Setup .env first ex: cp .env.example .env"
	docker-compose -f docker-compose.appstore-tycho.yml pull && docker-compose -f docker-compose.appstore-tycho.yml up --remove-orphans

#compose.ui: run the ui project with docker-compose
compose.ui:
	echo "Setup .env first ex: cp .env.example .env"
	docker-compose -f docker-compose.helxui.yml up --remove-orphans

#compose.down: stop docker-compose orchestrated containers
compose.down:
	docker-compose -f docker-compose.helxui.yml -f docker-compose.appstore.yml down --remove-orphans

#helxui.start: launch the project using react-scripts
helxui.start:
	npm run start

#install.npm: setup project dependencies
install.npm:
	npm install

#install.ci: install ci dependencies
install.ci:
	npm ci

#lint: lint the project based on settings in package.json
lint:
	npm run lint

#test: run all test https://create-react-app.dev/docs/running-tests/#continuous-integration
test: lint
	CI=true npm test

#test.interactive: run test in interactive mode, useful for development
test.interactive:
	npm run test

#publish: push all artifacts to registries
publish: build.image
	if [ -z "$(VER)" ]; then echo "Please provide a value for the VER variable like this:"; echo "make VER=4 build.image"; false; fi;
	docker image push $(DOCKER_ORG)/$(DOCKER_TAG)

#clean: remove build artifacts and project dependencies
clean:
	rm -rf build
	rm -rf node_modules
	rm -rf tycho

#all: clean the project, test and create artifacts
all: clean install.npm lint test build

#reinstall: remove project artifacts/dependencies and install based on latest
reinstall: clean install.npm build.npm

#ci: orchestrates the steps to be ran for continous integration
ci: clean install.ci lint test build.image

#clone.tycho: clone develop branch of tycho
clone.tycho:
	echo "Cloning tycho from branch: ${TYCHO_BRANCH}";
	if [ -d $(TYCHO_PATH) ]; then \
		echo $(TYCHO_PATH); \
	else git clone https://github.com/helxplatform/tycho.git --branch $(TYCHO_BRANCH); \
	fi
