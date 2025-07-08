// This module relies on the global `idb` library loaded from index.html

const { openDB } = idb;

const DB_NAME = 'tasklab-tasks-db';
const DB_VERSION = 1;
const STORE_NAME = 'tasks';

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: '_id' });
      }
    },
  });
}

export async function saveTasksToDb(tasks) {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await tx.store.clear();
  await Promise.all(tasks.map(task => tx.store.put(task)));
  return tx.done;
}

export async function getAllTasks() {
  const db = await getDb();
  return db.getAll(STORE_NAME);
}

export async function addTask(task) {
  const db = await getDb();
  return db.put(STORE_NAME, task);
}

export async function updateTask(task) {
  const db = await getDb();
  return db.put(STORE_NAME, task);
}

export async function deleteTask(taskId) {
  const db = await getDb();
  return db.delete(STORE_NAME, taskId);
}

export async function getTask(taskId) {
    const db = await getDb();
    return db.get(STORE_NAME, taskId);
}