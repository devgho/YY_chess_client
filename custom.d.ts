/* 此项目的http请求封装 */
declare function get( path:string,data:object,handler:function) {}
declare function post( path:string,data:object,handler:function) {}
declare function setURL(url?:string) {}
declare var io : {
    connect(url: string,opt?:object): Socket;
};
interface Socket {
    on(event: string, callback: (data: any) => void );
    emit(event: string, data: any);
    connected:boolean;
    disconnect();
} 