/**
 * Android Bridge - Handles native Android features
 * This file provides JavaScript interfaces to native Android functionality
 */

export const AndroidBridge = {
  /**
   * Download file to Android Downloads folder
   * @param {string} url - File URL
   * @param {string} filename - Desired filename
   */
  downloadFile: (url, filename = 'download') => {
    if (window.Android && window.Android.downloadFile) {
      window.Android.downloadFile(url, filename);
    } else {
      // Fallback for web browsers
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
    }
  },

  /**
   * Open file browser to select media
   * @returns {Promise<File>}
   */
  selectFile: async () => {
    return new Promise((resolve, reject) => {
      if (window.Android && window.Android.selectFile) {
        window.Android.selectFile((result) => {
          if (result && result.success) {
            resolve(result.file);
          } else {
            reject(new Error('File selection cancelled'));
          }
        });
      } else {
        // Fallback for web
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.onchange = (e) => {
          resolve(e.target.files[0]);
        };
        input.onerror = () => reject(new Error('File selection failed'));
        input.click();
      }
    });
  },

  /**
   * Pick file from Android file system
   * @returns {Promise<string>} - File URI
   */
  pickFromGallery: async () => {
    return new Promise((resolve, reject) => {
      if (window.Android && window.Android.pickFromGallery) {
        window.Android.pickFromGallery((uri) => {
          if (uri) {
            resolve(uri);
          } else {
            reject(new Error('Gallery pick cancelled'));
          }
        });
      } else {
        reject(new Error('Not available on web'));
      }
    });
  },

  /**
   * Take photo using device camera
   * @returns {Promise<string>} - Photo URI
   */
  takePhoto: async () => {
    return new Promise((resolve, reject) => {
      if (window.Android && window.Android.takePhoto) {
        window.Android.takePhoto((uri) => {
          if (uri) {
            resolve(uri);
          } else {
            reject(new Error('Camera cancelled'));
          }
        });
      } else {
        reject(new Error('Not available on web'));
      }
    });
  },

  /**
   * Get app version
   * @returns {string}
   */
  getAppVersion: () => {
    if (window.Android && window.Android.getAppVersion) {
      return window.Android.getAppVersion();
    }
    return '1.0.0';
  },

  /**
   * Share file or text
   * @param {string} title - Share title
   * @param {string} content - Share content
   */
  share: (title, content) => {
    if (window.Android && window.Android.share) {
      window.Android.share(title, content);
    } else if (navigator.share) {
      navigator.share({ title, text: content });
    }
  },

  /**
   * Show toast notification
   * @param {string} message
   * @param {number} duration
   */
  showToast: (message, duration = 2000) => {
    if (window.Android && window.Android.showToast) {
      window.Android.showToast(message, duration);
    } else {
      console.log(message);
    }
  },

  /**
   * Show native alert
   * @param {string} title
   * @param {string} message
   */
  alert: (title, message) => {
    if (window.Android && window.Android.alert) {
      window.Android.alert(title, message);
    } else {
      window.alert(`${title}\n${message}`);
    }
  },

  /**
   * Handle back button press
   * @param {Function} callback
   */
  onBackPressed: (callback) => {
    if (window.Android && window.Android.setBackPressedListener) {
      window.Android.setBackPressedListener(callback);
    } else {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Backspace') {
          callback();
        }
      });
    }
  },
};

export default AndroidBridge;
