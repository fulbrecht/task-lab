let currentUser = null;
let userLists = [];

export function setCurrentUser(username) {
    currentUser = username;
}

export function getCurrentUser() {
    return currentUser;
}

export function clearCurrentUser() {
    currentUser = null;
}

export function setUserLists(lists) {
    userLists = lists;
}

export function getUserLists() {
    return userLists;
}

export function clearUserLists() {
    userLists = [];
}