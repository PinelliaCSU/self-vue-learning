import {defineStore} from 'pinia'
export const useMessageCountStore = defineStore('messageCount', {
  state: () => ({
    messageCount: {
        chatCount: 0, // 聊天消息数量
        contactApplyCount: 0, // 联系人申请数量
    },
  }),
  actions: {
    setCount(key,count,forceUpdate){
        if(forceUpdate){//强制更新
            this.messageCount[key] = count;
            return;
        }
        let curCount = this.messageCount[key];
        this.messageCount[key] = curCount + count;
    },
    getCount(key){
        return this.messageCount[key];
    }
  },
})