.PHONY: save deploy

# Windows cmd's DATE can prompt and hang; use PowerShell for a stable timestamp.
ifeq ($(OS),Windows_NT)
SAVE_TS = $(shell powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'")
else
SAVE_TS = $(shell date '+%Y-%m-%d %H:%M:%S')
endif

save:
	@echo "Staging all changes..."
	@git add -A
	@echo "Committing changes..."
	@git commit -m "Auto-save: $(SAVE_TS)" || echo "No changes to commit or already committed"
	@echo "Save complete!"

deploy:
ifeq ($(OS),Windows_NT)
	@powershell -NoProfile -ExecutionPolicy Bypass -File deploy.ps1 "$(MESSAGE)"
else
	@bash deploy.sh "$(MESSAGE)"
endif


