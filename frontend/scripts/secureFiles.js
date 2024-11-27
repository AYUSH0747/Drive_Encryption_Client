document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    fetchSecureFiles();
    setupProfileDropdown();
    fetchUserProfile().then(updateProfileInfo);
    setupProfileIcon();
    checkAuthentication();
    setupPeriodicAuthCheck();
});

function setupEventListeners() {
    try {
        const elements = {
            homeLink: document.getElementById('homeLink'),
            dashboardLogo: document.getElementById('dashboardLogo'),
            myDriveLink: document.getElementById('myDriveLink'),
            starredLink: document.getElementById('starredLink'),
            profileToggle: document.getElementById('profileToggle'),
            uploadButton: document.getElementById('uploadToggle'),
            uploadFileBtn: document.getElementById('uploadFileBtn'),
            uploadFolderBtn: document.getElementById('uploadFolderBtn'),
            searchBar: document.getElementById('searchBar'),
            signOutButton: document.getElementById('signOutButton'),
            toggleViewButton: document.getElementById('toggleViewButton'),
            deleteModal: document.getElementById('deleteModal'),
            cancelDeleteBtn: document.getElementById('cancelDelete'),
            confirmDeleteBtn: document.getElementById('confirmDelete'),
            darkModeToggle: document.getElementById('darkModeToggle'),
            settingsButton: document.getElementById('settingsButton')
        };

        if (elements.homeLink) elements.homeLink.addEventListener('click', () => window.location.href = 'dashboard.html');
        if (elements.dashboardLogo) elements.dashboardLogo.addEventListener('click', () => window.location.href = 'dashboard.html');
        if (elements.myDriveLink) elements.myDriveLink.addEventListener('click', fetchSecureFiles);
        if (elements.starredLink) elements.starredLink.addEventListener('click', () => alert("Secure Download functionality not implemented yet."));
        if (elements.profileToggle) elements.profileToggle.addEventListener('click', toggleProfileDropdown);
        if (elements.uploadButton) elements.uploadButton.addEventListener('click', toggleUploadMenu);
        if (elements.uploadFileBtn) elements.uploadFileBtn.addEventListener('click', handleSecureFileUpload);
        if (elements.uploadFolderBtn) elements.uploadFolderBtn.addEventListener('click', handleSecureFolderUpload);
        if (elements.searchBar) elements.searchBar.addEventListener('input', () => filterFiles(elements.searchBar.value.toLowerCase()));
        if (elements.signOutButton) elements.signOutButton.addEventListener('click', handleSignOut);
        if (elements.toggleViewButton) elements.toggleViewButton.addEventListener('click', toggleView);
        if (elements.cancelDeleteBtn) elements.cancelDeleteBtn.addEventListener('click', hideDeleteModal);
        if (elements.confirmDeleteBtn) elements.confirmDeleteBtn.addEventListener('click', function(){
            const fileID = deleteModal.dataset.fileId;
            deleteSecureFile(fileID);
            hideDeleteModal();
        });
        if (elements.darkModeToggle) elements.darkModeToggle.addEventListener('click', toggleDarkMode);
        if (elements.settingsButton) elements.settingsButton.addEventListener('click', openSettings);

        const filterButtons = document.querySelectorAll('.file-filters .filter-option');
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                const filter = this.textContent.toLowerCase();
                fetchSecureFiles(filter);
            });
        });

        console.log('Event listeners set up successfully');
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }

    // Global click event listener
    document.addEventListener('click', function(event) {
        const profileDropdown = document.getElementById('profileDropdown');
        const uploadMenu = document.getElementById('uploadMenu');

        if (!event.target.closest('.profile-section') && profileDropdown) {
            profileDropdown.style.display = 'none';
        }
        if (!event.target.closest('.upload-dropup') && uploadMenu) {
            uploadMenu.classList.remove('show');
        }
    });
}

async function fetchSecureFiles(filter = 'all') {
    try {
        showLoadingIndicator();
        const response = await fetch(`/listSecureFiles?filter=${filter}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        displaySecureFiles(data);
    } catch (error) {
        console.error('Error fetching secure files:', error);
        showAlert('Failed to load secure files. Please try again later.', 'error');
        document.getElementById('fileList').innerHTML = '<p>Failed to load secure files. Please try again later.</p>';
    } finally {
        hideLoadingIndicator();
    }
}

function displaySecureFiles(files) {
    const fileListElement = document.getElementById('fileList');
    fileListElement.innerHTML = '';

    if (!Array.isArray(files) || files.length === 0) {
        fileListElement.innerHTML = '<p>No secure files found.</p>';
        return;
    }

    files.forEach(file => {
        const fileElement = document.createElement('div');
        fileElement.classList.add('file-item');
        const iconPath = getFileIconPath(file.mimeType, file.name);

        fileElement.innerHTML = `
            <div class="file-item-content">
                <img src="${iconPath}" alt="${file.name}" class="file-icon" width="40" height="40">
                <div class="file-item-info">
                    <a href="#" class="file-link">${file.name}</a>
                    <div class="file-details">
                        <span>${file.owners ? file.owners[0].displayName : 'Unknown'}</span>
                        <span>${formatDate(file.modifiedTime)}</span>
                        <span>${formatFileSize(file.size)}</span>
                        <span class="encrypted-tag">Encrypted</span>
                    </div>
                </div>
            </div>
            <div class="file-actions">
                <button class="file-action-button download-btn" data-file-id="${file.id}">
                    <i class="fas fa-download"></i>
                </button>
                <button class="file-action-button delete-btn" data-file-id="${file.id}" data-file-name="${file.name}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        fileListElement.appendChild(fileElement);
    });

    // Add event listeners for file actions
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', handleDelete);
    });
    document.querySelectorAll('.download-btn').forEach(button => {
        button.addEventListener('click', handleSecureDownload);
    });
}

function filterFiles(searchTerm) {
    const fileItems = document.querySelectorAll('.file-item');
    fileItems.forEach(item => {
        const fileName = item.querySelector('.file-link').textContent.toLowerCase();
        if (fileName.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

function handleSecureFileUpload(event) {
    event.preventDefault();
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.onchange = function () {
        const file = fileInput.files[0];
        if (file) {
            uploadSecureFile(file);
        }
    };
    fileInput.click();
}

function handleSecureFolderUpload(event) {
    event.preventDefault();
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.webkitdirectory = true;
    fileInput.onchange = function () {
        if (fileInput.files.length > 0) {
            const formData = new FormData();
            const folderPath = fileInput.files[0].webkitRelativePath.split('/')[0];
            formData.append('folderName', folderPath);
            for (const file of fileInput.files) {
                formData.append('files', file);
            }
            uploadSecureFolderToServer(formData, fileInput.files.length);
        }
    };
    fileInput.click();
}

async function uploadSecureFile(file) {
    const formData = new FormData();
    const encryptionKey = CryptoJS.lib.WordArray.random(256/8).toString();
    
    try {
        showLoadingIndicator();
        const fileArrayBuffer = await file.arrayBuffer();
        const wordArray = CryptoJS.lib.WordArray.create(fileArrayBuffer);
        const encryptedContent = CryptoJS.AES.encrypt(wordArray, encryptionKey).toString();
        const encryptedBlob = new Blob([encryptedContent], { type: 'application/octet-stream' });
        formData.append('file', encryptedBlob, file.name);
        formData.append('encryptionKey', encryptionKey);
        formData.append('tags', 'encrypted');

        const response = await fetch('/uploadSecureFile', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        localStorage.setItem(`encryptionKey_${result.fileId}`, encryptionKey);
        showAlert('Secure file uploaded successfully', 'success');
        fetchSecureFiles();
    } catch (error) {
        console.error('Error encrypting and uploading file:', error);
        showAlert('An error occurred while processing the file.', 'error');
    } finally {
        hideLoadingIndicator();
    }
}

async function uploadSecureFolderToServer(formData, totalFiles) {
    try {
        showLoadingIndicator();
        const response = await fetch('/uploadSecureFolder', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.text();
        showAlert('Secure folder uploaded successfully', 'success');
        fetchSecureFiles();
    } catch (error) {
        console.error('Error uploading secure folder:', error);
        showAlert('An error occurred while uploading the secure folder.', 'error');
    } finally {
        hideLoadingIndicator();
    }
}

async function handleSecureDownload(event) {
    const fileId = event.currentTarget.dataset.fileId;
    const encryptionKey = localStorage.getItem(`encryptionKey_${fileId}`);
    
    if (!encryptionKey) {
        showAlert('Encryption key not found. Unable to download the file.', 'error');
        return;
    }

    try {
        showLoadingIndicator();
        const response = await fetch(`/downloadSecureFile/${fileId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const encryptedBlob = await response.blob();
        const reader = new FileReader();
        reader.onload = function(e) {
            const encryptedContent = e.target.result;
            const decryptedWordArray = CryptoJS.AES.decrypt(encryptedContent, encryptionKey);
            const decryptedArrayBuffer = wordArrayToArrayBuffer(decryptedWordArray);
            const decryptedBlob = new Blob([decryptedArrayBuffer]);
            
            const url = window.URL.createObjectURL(decryptedBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'decrypted_file';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        };
        reader.readAsText(encryptedBlob);
    } catch (error) {
        console.error('Error downloading secure file:', error);
        showAlert('Failed to download secure file. Please try again.', 'error');
    } finally {
        hideLoadingIndicator();
    }
}

function wordArrayToArrayBuffer(wordArray) {
    const arrayBuffer = new ArrayBuffer(wordArray.sigBytes);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < wordArray.sigBytes; i++) {
        uint8Array[i] = (wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }
    return arrayBuffer;
}

function showLoadingIndicator() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
}

function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

async function fetchUserProfile() {
    try {
        const response = await fetch('/api/userProfile');
        if (!response.ok) {
            throw new Error('Failed to fetch profile');
        }
        const profileData = await response.json();
        updateProfileInfo(profileData);
        return profileData;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        showAlert("Failed to load user profile. Please try to re-login.", 'error');
        throw error;
    }
}

function updateProfileInfo(profileData) {
    document.getElementById('profileName').textContent = profileData.name;
    document.getElementById('profileEmail').textContent = profileData.email;
    document.getElementById('profilePicture').src = profileData.profilePicture || 'assets/default-profile-icon.png';
    document.getElementById('profileIconImage').src = profileData.profilePicture || 'assets/default-profile-icon.png';
}

function handleDelete(event) {
    event.stopPropagation();
    const fileId = event.currentTarget.dataset.fileId;
    const fileName = event.currentTarget.dataset.fileName;
    if (fileId && fileName) {
        showDeleteModal(fileId, fileName);
    } else {
        console.error('File ID or name is missing');
        showAlert('Error: Unable to delete file. Please try again.', 'error');
    }
}

async function deleteSecureFile(fileId) {
    try {
        showLoadingIndicator();
        const response = await fetch(`/deleteSecureFile/${fileId}`, { method: 'DELETE' });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        showAlert('Secure file deleted successfully', 'success');
        fetchSecureFiles();
    } catch (error) {
        console.error('Error deleting secure file:', error);
        showAlert('An error occurred while deleting the secure file', 'error');
    } finally {
        hideLoadingIndicator();
    }
}

function toggleUploadMenu() {
    const uploadMenu = document.getElementById('uploadMenu');
    if (uploadMenu) {
        uploadMenu.classList.toggle('show');
    }
}

function showAlert(message, type) {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        console.error('Alert container not found');
        return;
    }

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    const icon = document.createElement('span');
    icon.className = 'alert-icon';
    icon.innerHTML = getAlertIcon(type);
    
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    
    const closeButton = document.createElement('button');
    closeButton.className = 'alert-close';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => {
        alert.remove();
    };
    
    alert.appendChild(icon);
    alert.appendChild(messageSpan);
    alert.appendChild(closeButton);
    
    alertContainer.appendChild(alert);
    
    alert.offsetHeight;
    
    alert.classList.add('show');
    
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => {
            alert.remove();
        }, 300);
    }, 5000);
}

function getAlertIcon(type) {
    switch (type) {
        case 'error':
            return '<i class="fas fa-exclamation-circle"></i>';
        case 'success':
            return '<i class="fas fa-check-circle"></i>';
        case 'info':
        default:
            return '<i class="fas fa-info-circle"></i>';
    }
}

function showDeleteModal(fileId, fileName) {
    const deleteModal = document.getElementById('deleteModal');
    deleteModal.style.display = 'block';
    deleteModal.dataset.fileId = fileId;
    
    const modalMessage = deleteModal.querySelector('p');
    modalMessage.textContent = `Are you sure you want to delete "${fileName}"? This action cannot be undone.`;
}

function hideDeleteModal() {
    const deleteModal = document.getElementById('deleteModal');
    deleteModal.style.display = 'none';
}

function toggleView() {
    const fileListElement = document.getElementById('fileList');
    const toggleViewIcon = document.getElementById('toggleViewIcon');
    const isGrid = fileListElement.classList.toggle('file-grid');

    if (isGrid) {
        toggleViewIcon.src = 'assets/file-icons/list-icon.png';
        fileListElement.classList.remove('file-list');
    } else {
        toggleViewIcon.src = 'assets/file-icons/grid-icon.png';
        fileListElement.classList.add('file-list');
    }

    fetchSecureFiles();
}

function setupProfileDropdown() {
    const profileToggle = document.getElementById('profileToggle');
    const profileDropdown = document.getElementById('profileDropdown');

    profileToggle.addEventListener('click', function(event) {
        event.stopPropagation();
        toggleProfileDropdown();
    });

    document.addEventListener('click', function(event) {
        if (!profileDropdown.contains(event.target) && event.target !== profileToggle) {
            profileDropdown.style.display = 'none';
        }
    });
}

function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    // You can add logic here to save the user's preference
}

function openSettings() {
    // Implement your settings functionality here
    console.log('Settings clicked');
}

function setupProfileIcon() {
    const profileIconImage = document.getElementById('profileIconImage');
    const profilePicture = document.getElementById('profilePicture');
    const defaultProfileImage = 'assets/default-profile-icon.png';

    function setDefaultImage(imgElement) {
        imgElement.src = defaultProfileImage;
    }

    profileIconImage.onerror = function() {
        setDefaultImage(this);
    };

    profilePicture.onerror = function() {
        setDefaultImage(this);
    };

    if (!profileIconImage.src || profileIconImage.src === window.location.href) {
        setDefaultImage(profileIconImage);
    }

    if (!profilePicture.src || profilePicture.src === window.location.href) {
        setDefaultImage(profilePicture);
    }
}

async function handleSignOut() {
    try {
        const response = await fetch('/api/signout', {
            method: 'POST',
            credentials: 'include',
        });

        if (response.ok) {
            localStorage.removeItem('user');
            sessionStorage.clear();
            window.location.href = '/';
        } else {
            const errorData = await response.json();
            console.error('Sign out failed:', errorData.error);
            showAlert('Failed to sign out. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error during sign out:', error);
        showAlert('An error occurred while signing out. Please try again.', 'error');
    }
}

function checkAuthentication() {
    fetch('/api/checkAuth', { credentials: 'include' })
      .then(response => {
        if (!response.ok) {
          console.error('Failed to fetch /api/checkAuth:', response.status, response.statusText);
          throw new Error('Authentication check failed');
        }
        return response.json();
      })
      .then(data => {
        if (!data.authenticated) {
          window.location.href = '/login.html';
        }
      })
      .catch(error => {
        console.error('Error checking authentication:', error);
        showAlert('Unable to check authentication status. Please try again.', 'error');
      });
}

function setupPeriodicAuthCheck() {
    setInterval(() => {
        fetch('/api/checkAuth')
            .then(response => response.json())
            .then(data => {
                if (!data.authenticated) {
                    window.location.href = '/login.html';
                }
            })
            .catch(error => {
                console.error('Error checking authentication:', error);
            });
    }, 60000); // Check every minute
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
  
    if (diffDays === 0) {
      if (diffHours === 0) {
        if (diffMinutes === 0) {
          return 'Just now';
        }
        return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
      }
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
}

function formatFileSize(bytes) {
    if (bytes === undefined) return 'Unknown';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIconPath(mimeType, fileName) {
    const fileExtension = fileName.split('.').pop().toLowerCase();
    
    const iconMap = {
      'folder': 'folder.png',
      'audio': 'audio.png',
      'video': 'video.png',
      'image': 'image.png',
      'pdf': 'pdf.png',
      'zip': 'zip.png',
      'doc': 'docx.png',
      'docx': 'docx.png',
      'xls': 'xls.png',
      'xlsx': 'xls.png',
      'ppt': 'pptx.png',
      'pptx': 'pptx.png',
      'txt': 'txt.png',
      'unknown': 'unknown.png'
    };
  
    let iconName;
  
    if (mimeType === 'application/vnd.google-apps.folder') {
      iconName = 'folder';
    } else if (mimeType.startsWith('audio/')) {
      iconName = 'audio';
    } else if (mimeType.startsWith('video/')) {
      iconName = 'video';
    } else if (mimeType.startsWith('image/')) {
      iconName = 'image';
    } else if (mimeType === 'application/pdf') {
      iconName = 'pdf';
    } else if (fileExtension in iconMap) {
      iconName = fileExtension;
    } else {
      iconName = 'unknown';
    }
  
    return `/assets/file-icons/${iconMap[iconName]}`;
}

