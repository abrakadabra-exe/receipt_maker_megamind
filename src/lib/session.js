let masterKey = null

export function setMasterKey(key) {
  masterKey = key
}

export function getMasterKey() {
  return masterKey
}

export function clearMasterKey() {
  masterKey = null
}

export function hasMasterKey() {
  return masterKey !== null
}