.PHONY: save

save:
	@echo "Staging all changes..."
	@git add -A
	@echo "Committing changes..."
	@git commit -m "Auto-save: $(shell date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit or already committed"
	@echo "Save complete!"

