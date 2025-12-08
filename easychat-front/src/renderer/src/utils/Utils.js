import moment from "moment";
moment.locale('zh-cn', {
    months: '一月_二月_三月_四月_五月_六月_七月_八月_九月_十月_十一月_十二月'.split('_'),
    monthsShort: '1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月'.split('_'),
    weekdays: '星期日_星期一_星期二_星期三_星期四_星期五_星期六'.split('_'),
    weekdaysShort: '周日_周一_周二_周三_周四_周五_周六'.split('_'),
    weekdaysMin: '日_一_二_三_四_五_六'.split('_'),
    longDateFormat: {
        LT: 'HH:mm',
        LTS: 'HH:mm:ss',
        L: 'YYYY-MM-DD',
        LL: 'YYYY年MM月DD日',
        LLL: 'YYYY年MM月DD日Ah点mm分',
        LLLL: 'YYYY年MM月DD日ddddAh点mm分',
        1: 'YYYY-M-D',
        11: 'YYYY年M月D日',
        111: 'YYYY年M月D日 HH:mm',
        1111: 'YYYY年M月D日dddd HH:mm'
    }
});

const isEmpty = (str)=>{
    if(str == null || str == "" || str == undefined){
        return true;
    }
    return false;
}

const getAreaInfo = (data)=>{
    if(isEmpty(data)){
        return '-';
    }
    return data.replace(","," ");
}

const formatDate = (timestamp)=>{
    const timestampTime = moment(timestamp);
    const days = Number.parseInt(moment().format("YYYYMMDD")) - Number.parseInt(timestampTime.format("YYYYYMMDD"));
    if(days == 0){
        return timestampTime.format("HH:mm");
    }else if(days == 1){
        return "昨天 "
    }else if(days >= 2 && days < 7){
        return timestampTime.format("dddd"); 
    }else if(days >= 7){
        return timestampTime.format("YY/MM/DD"); //其他
    }
}
const size2Str = (limit) => {
    var size = "";
    if (limit < 0.1 * 1024) {
        size = limit.toFixed(2) + "B"
    } else if (limit < 1024 * 1024) {
        size = (limit / 1024).toFixed(2) + "KB"
    } else if (limit < 1024 * 1024 * 1024) {
        size = (limit / (1024 * 1024)).toFixed(2) + "MB"
    } else {
        size = (limit / (1024 * 1024 * 1024)).toFixed(2) + "GB"
    }
    var sizeStr = size + "";
    var index = sizeStr.indexOf(".");
    var dou = sizeStr.substring(index + 1, index + 3)
    if (dou == "00") {
        return sizeStr.substring(0, index) + sizeStr.substr(index + 3, 2)
    }
    return size;
    //小于0.1KB，则转化成B
    //小于0.1MB，则转化成KB
}
export default {
    isEmpty,
    getAreaInfo,
    formatDate,
    size2Str
}


