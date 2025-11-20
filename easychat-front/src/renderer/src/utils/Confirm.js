import { ElMessageBox } from 'element-plus'

const confirm = ({ message, onOk, showCancelBtn = true, okText = '确定' }) => {
    ElMessageBox.confirm(message, '提示', {
        "close-on-click-modal": false,
        confirmButtonText: okText,
        cancelButtonText: '取消',
        showCancelButton: showCancelBtn,
        type: 'info',
    }).then(async () => {
        if (onOk) {
            onOk();
        }
    }).catch (() => {
        
    });
};
export default confirm;