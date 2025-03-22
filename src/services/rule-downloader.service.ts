import * as vscode from 'vscode';
import * as path from 'path';
import { Rule, AIToolFormat, GenericFormat } from '../models/rule.model';
import { Logger } from '../utils/logger';

/**
 * Options for saving a rule to a file
 */
export interface RuleSaveOptions {
    /**
     * Directory to save the rule in, defaults to workspace folder or user's home directory
     */
    directory?: string;

    /**
     * Format to save the rule in, defaults to markdown
     */
    format?: string;

    /**
     * Whether to include metadata in the saved file, defaults to true
     */
    includeMetadata?: boolean;
}

/**
 * Service for downloading and saving rules to disk
 */
export class RuleDownloaderService {
    private logger: Logger = Logger.getInstance();

    /**
     * Download and save a rule to disk
     */
    public async downloadRule(rule: Rule, options: RuleSaveOptions = {}): Promise<string> {
        try {
            if (!rule.title) {
                this.logger.error('Cannot download rule: title is undefined', null, 'RuleDownloaderService');
                throw new Error('Rule title is undefined');
            }

            // Generate filename-safe version of the title
            const sanitizedTitle = this.sanitizeFilename(rule.title);

            // Get content of the rule
            const content = rule.content;

            if (!content) {
                this.logger.error('Cannot download rule: content is undefined', null, 'RuleDownloaderService');
                throw new Error('Rule content is undefined');
            }

            // Determine file format (extension)
            const format = options.format || GenericFormat.MD;

            // Generate formatted content including metadata if requested
            let formattedContent = '';

            if (options.includeMetadata !== false) {
                formattedContent += `# ${rule.title}\n\n`;
                formattedContent += `> From [CodingRules.ai](https://codingrules.ai/rules/${rule.slug})\n\n`;

                if (rule.tags && rule.tags.length > 0) {
                    const tagNames = rule.tags.map((tag) => tag.name).join(', ');
                    formattedContent += `**Tags:** ${tagNames}\n\n`;
                }

                formattedContent += `---\n\n`;
            }

            // Add the main content
            formattedContent += content;

            // Determine save directory
            let saveDirectory = options.directory;

            if (!saveDirectory) {
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                saveDirectory = workspaceFolder || this.getUserHomeDir();
            }

            // Create full file path
            const filename = `${sanitizedTitle}${format}`;
            const filePath = path.join(saveDirectory, filename);

            // Create URI for the file
            const fileUri = vscode.Uri.file(filePath);

            // Write to file
            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(formattedContent, 'utf8'));

            this.logger.info(`Rule saved to ${filePath}`, 'RuleDownloaderService');
            return filePath;
        } catch (error) {
            this.logger.error('Error downloading rule', error, 'RuleDownloaderService');
            throw error;
        }
    }

    /**
     * Sanitize a filename to be safe for all operating systems
     */
    private sanitizeFilename(filename: string): string {
        // Replace invalid characters with underscores
        return filename
            .replace(/[/\\?%*:|"<>]/g, '_') // Remove characters illegal in Windows
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .replace(/_{2,}/g, '_') // Replace multiple underscores with a single one
            .toLowerCase(); // Lowercase for consistency
    }

    /**
     * Get the user's home directory
     */
    private getUserHomeDir(): string {
        return process.env.HOME || process.env.USERPROFILE || '.';
    }
}
