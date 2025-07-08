// This module relies on the global `idb` library loaded from index.html

const { openDB } = idb;

const DB_NAME = 'tasklab-db';
const DB_VERSION = 3; // Increment DB version to force upgrade
export const TASK_STORE_NAME = 'tasks';
export const LIST_STORE_NAME = 'lists';

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore(TASK_STORE_NAME, { keyPath: '_id' });
      }
      if (oldVersion < 2) {
        db.createObjectStore(LIST_STORE_NAME, { keyPath: 'name' });
      }
    },
  });
}

export async function saveTasksToDb(tasks) {
  const db = await getDb();
  const tx = db.transaction(TASK_STORE_NAME, 'readwrite');
  await tx.store.clear();
  await Promise.all(tasks.map(task => tx.store.put(task)));
  return tx.done;
}

export async function getAllTasks() {
  const db = await getDb();
  return db.getAll(TASK_STORE_NAME);
}

export async function addTask(task) {
  const db = await getDb();
  return db.put(TASK_STORE_NAME, task);
}

export async function updateTask(task) {
  const db = await getDb();
  return db.put(TASK_STORE_NAME, task);
}

export async function deleteTask(taskId) {
  const db = await getDb();
  return db.delete(TASK_STORE_NAME, taskId);
}

export async function getTask(taskId) {
    const db = await getDb();
    return db.get(TASK_STORE_NAME, taskId);
}

export async function saveListsToDb(lists) {
  const db = await getDb();
  const tx = db.transaction(LIST_STORE_NAME, 'readwrite');
  await tx.store.clear();
  await Promise.all(lists.map(listName => tx.store.put({ name: listName })));
  return tx.done;
}

export async function getAllLists() {
  const db = await getDb();
  const listObjects = await db.getAll(LIST_STORE_NAME);
  return listObjects.map(obj => obj.name);
}

export async function addList(listName) {
  const db = await getDb();
  return db.put(LIST_STORE_NAME, { name: listName });
}

export async function deleteList(listName) {
  const db = await getDb();
  return db.delete(LIST_STORE_NAME, listName);
}