up-container:
	cd run && \
	docker compose up -d --build magicmirror

down-container:
	cd run && \
	docker compose down

restart-container: down-container up-container

