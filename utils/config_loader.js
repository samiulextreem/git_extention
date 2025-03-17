/**
 * config_loader.js - Utility to load configuration from YAML files
 */

// Simple YAML parser for the specific format we need
function parseYaml(yamlText) {
  const lines = yamlText.split('\n');
  const config = {};
  
  lines.forEach(line => {
    // Skip empty lines or comments
    if (!line.trim() || line.trim().startsWith('#')) return;
    
    // Parse key-value pairs
    const match = line.match(/^([^:]+):\s*"?([^"]*)"?$/);
    if (match) {
      const [, key, value] = match;
      config[key.trim()] = value.trim();
    }
  });
  
  return config;
}

/**
 * Load configuration from a YAML file
 * @param {string} filePath - Path to the YAML file
 * @returns {Promise<Object>} - Parsed configuration
 */
async function loadConfigFromYaml(filePath) {
  try {
    const response = await fetch(chrome.runtime.getURL(filePath));
    if (!response.ok) {
      throw new Error(`Failed to load config file: ${response.status}`);
    }
    
    const yamlText = await response.text();
    return parseYaml(yamlText);
  } catch (error) {
    console.error('Error loading config:', error);
    return null;
  }
}

/**
 * Save configuration to Chrome storage
 * @param {Object} config - Configuration to save
 * @returns {Promise<void>}
 */
async function saveConfigToStorage(config) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ 'appConfig': config }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get configuration from Chrome storage
 * @returns {Promise<Object>} - Stored configuration
 */
async function getConfigFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('appConfig', (result) => {
      resolve(result.appConfig || {});
    });
  });
}

/**
 * Initialize configuration by loading from YAML and saving to storage
 * @returns {Promise<Object>} - The loaded configuration
 */
async function initializeConfig() {
  const config = await loadConfigFromYaml('appurl.yaml');
  if (config) {
    await saveConfigToStorage(config);
    console.log('Configuration initialized from YAML file');
  } else {
    console.warn('Failed to load configuration from YAML, using stored config if available');
  }
  
  return await getConfigFromStorage();
}

// Export functions
export {
  loadConfigFromYaml,
  saveConfigToStorage,
  getConfigFromStorage,
  initializeConfig
}; 