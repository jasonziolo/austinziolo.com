#!/bin/bash

# GitHub Pages Deployment Script
# Usage: ./deploy.sh "Your commit message"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting deployment to GitHub Pages...${NC}"

# Check if commit message provided
if [ -z "$1" ]; then
    COMMIT_MSG="Update site $(date '+%Y-%m-%d %H:%M:%S')"
else
    COMMIT_MSG="$1"
fi

# Add all changes
echo -e "${BLUE}Adding files...${NC}"
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo -e "${GREEN}No changes to commit.${NC}"
    exit 0
fi

# Commit changes
echo -e "${BLUE}Committing changes...${NC}"
git commit -m "$COMMIT_MSG"

# Push to GitHub
echo -e "${BLUE}Pushing to GitHub...${NC}"
git push origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Successfully deployed!${NC}"
    echo -e "${GREEN}Your site will be updated in 1-2 minutes.${NC}"
else
    echo -e "${RED}✗ Deployment failed. Check the errors above.${NC}"
    exit 1
fi