import original from './playwright.config';
import { defineConfig } from '@playwright/test';

// Keep the existing projects' tag and file filters. --all restores every project.
export default defineConfig(process.argv.includes('--project=*') ? original : {
    ...original,
    projects: original.projects?.filter(project => ['phone', 'desktop'].includes(project.name ?? '')),
});