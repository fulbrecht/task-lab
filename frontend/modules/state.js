let currentUser = null;

export function setCurrentUser(username) {
    currentUser = username;
}

export function getCurrentUser() {
    return currentUser;
}

export function clearCurrentUser() {
    currentUser = null;
}