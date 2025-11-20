const Store = require('electron-store')
const store = new Store()

const getUserId =()=>{
    return store.get('currentUserId')  // 如果不存在会返回 undefined
}

const initUserId = (_userId)=>{
    if (_userId == null) {
        // 明确使用 delete 来删除
        store.delete('currentUserId')
    } else {
        store.set('currentUserId', _userId)
    }
}

const setData = (key,value)=>{
    if(value == null){
        store.delete(key)
        return;
    }
    store.set(key,value)
}

const getData = (key)=>{
    return store.get(key)
}

const setUserData = (key,value)=>{
    const userId = getUserId()
    if (!userId) {
        console.error('UserId not initialized')
        return
    }
    setData(userId + key, value)
}

const getUserData = (key)=>{
    const userId = getUserId()
    if (!userId) {
        console.error('UserId not initialized')
        return null
    }
    return getData(userId + key)
}

const deleteUserData =(key)=>{
    const userId = getUserId()
    if (!userId) {
        console.error('UserId not initialized')
        return
    }
    store.delete(userId + key)
}

export default{
    initUserId,
    getUserId,
    setData,
    getData,
    setUserData,
    getUserData,
    deleteUserData
}