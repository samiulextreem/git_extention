# My Custom Extension

A Chrome extension that enhances your experience on ChatGPT, X (Twitter), and Claude.

## Features

- **Text Selection Tool**: Quickly access tools when selecting text on supported websites
- **Folder Management**: Organize your chats into folders
- **Premium Features**: Access additional features with a premium subscription
- **Export Functionality**: Export conversations to different formats

## Installation

1. Download the extension files
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension icon should now appear in your browser toolbar

## Usage

1. Visit one of the supported websites (ChatGPT, X, Claude)
2. Click the extension icon to activate it
3. Use the various features:
   - Select text to see the text selection tool
   - Use the folder management system to organize chats
   - Export conversations as needed

## Authentication

The extension uses a secure email-based authentication system:
1. Click the login button
2. Enter your email address
3. Check your email for a magic link
4. Click the link to authenticate

## Development

### Project Structure

- `manifest.json`: Extension configuration
- `background.js`: Background service worker
- `content.js`: Main content script functionality
- `login_popup.js`: Authentication handling
- `script.js`: Welcome page functionality
- `style.css`: Styling for the extension

### Building and Testing

To test changes locally:
1. Make your code changes
2. Reload the extension in `chrome://extensions/`
3. Test the functionality on supported websites

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please contact [support@example.com](mailto:support@example.com) 