importScripts('https://cdn.jsdelivr.net/npm/idb@7/build/umd.js');

const STATIC_CACHE_NAME = 'tasklab-static-v6';
const DYNAMIC_CACHE_NAME = 'tasklab-dynamic-v6';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/api.js',
  '/app.js',
  '/modules/state.js',
  '/modules/ui.js',
  '/modules/taskActions.js',
  '/modules/taskRenderer.js',
  '/modules/localDb.js',
  '/pushNotifications.js',
  'https://cdn.jsdelivr.net/npm/idb@7/build/umd.js'
];

const DB_NAME = 'tasklab-db';
const DB_VERSION = 4; // Increment DB version to force upgrade and create request-queue
const TASK_STORE_NAME = 'tasks';
const LIST_STORE_NAME = 'lists';
const QUEUE_STORE_NAME = 'request-queue';

async function getDb() {
  return idb.openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      console.log('Service Worker: IndexedDB upgrade triggered. Old version:', oldVersion);
      if (oldVersion < 1) {
        db.createObjectStore(TASK_STORE_NAME, { keyPath: '_id' });
        console.log('Service Worker: Created tasks object store.');
      }
      if (oldVersion < 2) {
        db.createObjectStore(LIST_STORE_NAME, { keyPath: 'name' });
        console.log('Service Worker: Created lists object store.');
      }
      if (oldVersion < 4) { // Ensure request-queue is created
        db.createObjectStore(QUEUE_STORE_NAME, { autoIncrement: true });
        console.log('Service Worker: Created request-queue object store.');
      }
    },
  });
}

// Call getDb() immediately to ensure upgrade logic runs on activation
getDb();

self.addEventListener('sync', (event) => {
  console.log('Service Worker: Sync event fired!', event.tag);
  if (event.tag.startsWith('sync-')) {
    event.waitUntil(syncData(event.tag));
  }
});

async function syncData(tag) {
  console.log(`Service Worker: Attempting to sync data for tag: ${tag}`);
  const db = await getDb();

  let requestsToDelete = []; // Store keys of requests to delete

  const transaction = db.transaction(QUEUE_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(QUEUE_STORE_NAME);

  let cursor = await store.openCursor();
  while (cursor) {
    const request = cursor.value;
    const key = cursor.primaryKey; // This is the IndexedDB-assigned key

    try {
      console.log('Service Worker: Processing queued request with key:', key, 'and data:', request);
      const fetchOptions = {
        method: request.method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (request.body && request.method !== 'DELETE') {
        fetchOptions.body = JSON.stringify(request.body);
      }
      console.log('Service Worker: Fetching:', request.url, fetchOptions);
      const response = await fetch(request.url, fetchOptions);

      if (response.ok) {
        const responseData = await response.json().catch(() => ({}));
        console.log('Service Worker: Request successful, response:', responseData, 'Status:', response.status);

        // Handle specific sync tags for reconciliation
        if (tag === 'sync-new-task' && request._id && responseData._id) {
          const taskTx = db.transaction(TASK_STORE_NAME, 'readwrite');
          const taskStore = taskTx.objectStore(TASK_STORE_NAME);
          await taskStore.delete(request._id);
          await taskStore.put(responseData);
          await taskTx.done;
          console.log(`Service Worker: Reconciled task ${request._id} with ${responseData._id}`);
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'SYNC_SUCCESS',
                payload: { tempId: request._id, finalTask: responseData }
              });
            });
          });
        } else if (tag === 'sync-add-list' && request._id && responseData.lists) {
            const listTx = db.transaction(LIST_STORE_NAME, 'readwrite');
            const listStore = listTx.objectStore(LIST_STORE_NAME);
            await listStore.clear();
            for (const listName of responseData.lists) {
                await listStore.put({ name: listName });
            }
            await listTx.done;
            console.log('Service Worker: Reconciled lists with server data.');
        } else if (tag === 'sync-delete-task' && request._id) {
            const taskTx = db.transaction(TASK_STORE_NAME, 'readwrite');
            const taskStore = taskTx.objectStore(TASK_STORE_NAME);
            await taskStore.delete(request._id);
            await taskTx.done;
            console.log(`Service Worker: Deleted task ${request._id} from local DB.`);
        } else if (tag === 'sync-update-task' && request._id && responseData._id) {
            const taskTx = db.transaction(TASK_STORE_NAME, 'readwrite');
            const taskStore = taskTx.objectStore(TASK_STORE_NAME);
            await taskStore.put(responseData);
            await taskTx.done;
            console.log(`Service Worker: Updated task ${request._id} in local DB.`);
        } else if (tag === 'sync-snooze-task' && request._id && responseData._id) {
            const taskTx = db.transaction(TASK_STORE_NAME, 'readwrite');
            const taskStore = taskTx.objectStore(TASK_STORE_NAME);
            await taskStore.put(responseData);
            await taskTx.done;
            console.log(`Service Worker: Snoozed task ${request._id} in local DB.`);
        } else if (tag === 'sync-delete-list' && request._id && responseData.lists) {
            const listTx = db.transaction(LIST_STORE_NAME, 'readwrite');
            const listStore = listTx.objectStore(LIST_STORE_NAME);
            await listStore.clear();
            for (const listName of responseData.lists) {
                await listStore.put({ name: listName });
            }
            await listTx.done;
            console.log('Service Worker: Reconciled lists after deletion with server data.');
        }

        requestsToDelete.push(key); // Mark for deletion
      } else if (response.status === 409) {
        console.warn('Service Worker: Request resulted in conflict (409). Removing from queue:', request);
        requestsToDelete.push(key); // Mark for deletion
      } else if (response.status === 404) {
        console.warn('Service Worker: Request resulted in not found (404). Removing from queue:', request);
        if (tag === 'sync-delete-task' && request._id) {
            const taskTx = db.transaction(TASK_STORE_NAME, 'readwrite');
            await taskTx.objectStore(TASK_STORE_NAME).delete(request._id);
            await taskTx.done;
            console.log(`Service Worker: Removed task ${request._id} from local DB due to 404.`);
        }
        requestsToDelete.push(key); // Mark for deletion
      } else {
        console.error('Service Worker: Request failed with status:', response.status);
        // Keep the request in the queue for retry
      }
    } catch (error) {
      console.error('Service Worker: Error processing queued request:', error);
      // Keep the request in the queue for retry
    }
    cursor = await cursor.continue();
  }

  // Delete all marked requests in a single transaction after processing all
  const deleteTransaction = db.transaction(QUEUE_STORE_NAME, 'readwrite');
  const deleteStore = deleteTransaction.objectStore(QUEUE_STORE_NAME);
  for (const key of requestsToDelete) {
    console.log('Service Worker: Deleting request with key:', key);
    await deleteStore.delete(key);
  }
  await deleteTransaction.done;
  console.log('Service Worker: All marked requests deleted from queue.');

  console.log(`Service Worker: Finished syncing data for tag: ${tag}`);
}

