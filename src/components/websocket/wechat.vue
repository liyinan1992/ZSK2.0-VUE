<template>
<div id="imChat">
  <div class="sidebar">
    <div class="card">
      <header>
        <img src="~@/assets/img/avatar.png" class="avatar" style="width:40px;">
       <p class="name">{{userName}}</p>
      </header>
      <footer>
        <input class="search" type="text" placeholder="search user...">
      </footer>
    </div>
    <div class="list">
      <ul>
        <li v-for="guest in guestNames" :key="guest.userName" :class="{ active: guest.userName === currentsid }" 
          @click="clickUser(guest.userName)">
          <!-- v-if  v-else 此处设置了是否在线的样式-->
          <img v-if="guest.isOnline" class="avatar" src="~@/assets/img/1.jpg" style="width:30px;">
          <img v-else class="avatar" src="~@/assets/img/2.jpg" style="width:30px;"> 
          <!-- v-if  v-else 此处设置了是否有新消息的样式-->
          <el-badge value="new" class="item" v-if="guest.hasNewInfo">
            <p class="name">{{guest.userName}}</p>
          </el-badge>
          <p class="name" v-else>{{guest.userName}}</p>
        </li>
      </ul>
    </div>
  </div>
  <div class="main">
    <div class="message" id="message">
      <ul>
        <li v-for="message in currentMessages" :key="message.id">
          <p class="time">
            <span>{{message.createDate}}</span>
          </p>
          <div class="main" :class="{ self: message.userName !==userName }">
            <img v-if="message.userName ===userName" class="avatar" style="width:30px;" src="~@/assets/img/avatar.png">
            <img v-else class="avatar" style="width:30px;" src="~@/assets/img/1.jpg"> 
            <div class="text" v-html="message.content"></div>
          </div>
        </li>
      </ul>
    </div>
    <!-- 加上传图片和查看历史记录功能 -->
    <div style="border-top:1px solid #aaa;width:100%;height:30px;">
      <div style="margin:2px;float:right;cursor: pointer;fill:black;" >
         <el-button size="mini" type="primary" @click="contentSubmit">发送消息</el-button>
      </div >
      <div style="margin-left:10px;margin-top:8px;float:left;cursor: pointer;fill:black;" @click="getHistoryData">
         <icon-svg  name="time"></icon-svg>
      </div>
      <div style="margin-left:10px;margin-top:8px;float:left;cursor: pointer;fill:black;" @click="uploadHandle">
         <icon-svg  name="image"></icon-svg>
      </div>
    </div>
    <div class="content">
      <el-input autofocus rows="7" type="textarea" placeholder="按 Ctrl + Enter 发送" v-model="chatContent" @keyup.native="addContent"></el-input>
    </div>
    <audio src="/static/video/msg.wav" id="notice"></audio>
    <upload-w-s v-if="uploadVisible" ref="upload" @addImgPathToContent="addImgContent"></upload-w-s>
  </div>
</div>
</template>
<script>
import uploadWS from '@/components/websocket/upload-ws'
import SockJS from 'sockjs-client'
import Stomp from 'stompjs'
export default {
  name: 'wechat',
  components: {
    uploadWS
  },
  data () {
    return {
      userName: '',
      guestNames: [],
      currentsid: '',
      currentMessages: [],
      chatContent: '',
      isguest: false,
      uploadVisible: false,
      stompClient: null
    }
  },
  activated () {
    // 在初始化的时候获取到当前的用户
    this.userName = this.$store.state.user.name

    // 先获取用户的角色信息，来判断当前用户是否是guest，根据此来获取用户列表
    this.getUserRoleInfo()

    this.initWebsocket()
  },
  updated () {
    var container = this.$el.querySelector('#message')
    container.scrollTop = container.scrollHeight
  },
  destroyed () {
    if (this.stompClient !== null) {
      console.log('关闭wesocket连接')
      this.stompClient.disconnect()
    }
  },
  methods: {
    // 建立websocket连接
    initWebsocket () {
      let socket = new SockJS(this.$http.adornUrl('/knowledge-websocket'))
      // 获取STOMP子协议的客户端对象
      this.stompClient = Stomp.over(socket)
      this.stompClient.connect({username: this.userName}, () => {
        this.stompClient.subscribe('/user/chat/login', (msg) => {
          let message = JSON.parse(msg.body)
          if (message.type === 'ADDUSER') {
            for (let element of this.guestNames) {
              if (element.userName === message.sid) {
                element.isOnline = true
              }
            }
          } else if (message.type === 'QUIT') {
            for (let element of this.guestNames) {
              if (element.userName === message.sid) {
                element.isOnline = false
              }
            }
          } else if (message.type === 'CONTENT') {
            // 提示音
            this.$el.querySelector('#notice').play()
            if (message.userName === this.currentsid) {
              this.currentMessages.push(message)
            }
            // 更新用户展示状态，当不是当前选中项且有新消息传来时显示新的样式
            for (let element of this.guestNames) {
              if (element.userName === message.userName && this.currentsid !== message.userName) {
                element.hasNewInfo = true
              }
            }
          }
        })
      })
    },
    // 点击用户名时获取聊天记录
    clickUser (guest) {
      this.currentsid = guest
      this.getUserHistory()
      // 修改标识是否有新消息的样式
      for (let element of this.guestNames) {
        if (element.userName === this.currentsid) {
          element.hasNewInfo = false
        }
      }
    },
    // 获取当前用户的角色列表
    getUserRoleInfo () {
      this.$http({
        url: this.$http.adornUrl(`/knowledge/question/roleInfo/${this.userName}`),
        method: 'get'
      }).then(({data}) => {
        if (data && data.code === 0) {
          this.isguest = data.isGuest
        }
      }).then(this.getUserList)
    },
    // 获取用户列表
    getUserList () {
      let tempUrl = ''
      if (!this.isguest) {
        tempUrl = 'guestNames'
      } else {
        tempUrl = 'adminNames'
      }
      this.$http({
        url: this.$http.adornUrl(`/knowledge/question/${tempUrl}`),
        method: 'get'
      }).then(({data}) => {
        if (data && data.code === 0) {
          this.guestNames = data.data
          if (this.guestNames.length > 0) {
            this.currentsid = this.guestNames[0].userName
            this.getUserHistory()
          }
        }
      })
    },
    // 获取当前用户的聊天记录
    getUserHistory () {
      this.$http({
        url: this.$http.adornUrl('/knowledge/question/chatContent'),
        method: 'get',
        params: this.$http.adornParams({
          userName: this.userName,
          SID: this.currentsid,
          page: 1,
          limit: 20
        })
      }).then(({data}) => {
        if (data && data.code === 0) {
          this.currentMessages = data.page.list
        }
      })
    },
    // 发送交谈内容
    addContent (e) {
      if (e.ctrlKey && e.keyCode === 13 && this.chatContent.length) {
        this.contentSubmit()
      }
    },
    contentSubmit () {
      if (this.chatContent.length) {
        let wsMessage = {
          userName: '',
          content: '',
          sid: '',
          type: ''
        }
        wsMessage.userName = this.userName
        wsMessage.content = this.chatContent
        wsMessage.sid = this.currentsid
        wsMessage.type = 'CONTENT'
        this.currentMessages.push(wsMessage)
        this.chatContent = ''
        // 后台去请求数据记录到数据库中
        this.$http({
          url: this.$http.adornUrl(`/knowledge/question/save`),
          method: 'post',
          data: this.$http.adornData({
            'content': wsMessage.content,
            'sid': wsMessage.sid,
            'userName': wsMessage.userName
          })
        })
        // 通知给后台
        console.log('发送消息:' + JSON.stringify(wsMessage))
        this.stompClient.send('/chat/hello', {}, JSON.stringify(wsMessage))
      }
    },
    // 上传文件
    uploadHandle () {
      this.uploadVisible = true
      this.$nextTick(() => {
        this.$refs.upload.init()
      })
    },
    addImgContent (imgList) {
      // <img class="avatar" width="30" height="30" src="~@/assets/img/1.jpg">
      // <a href="http://localhost:80/oaattach///20190110//bdcdyh不一致问题修改.txt" target="_blank">bdcdyh不一致问题修改.txt</a>
      imgList.forEach(element => {
        let imgStr
        if (element.endsWith('png') || element.endsWith('jpg') || element.endsWith('gif')) {
          imgStr = '<img src="' + element + '">'
        } else {
          imgStr = '<a href="' + element + '" target="_blank">' + element.substr(element.lastIndexOf('//') + 2) + '</a>'
        }
        this.chatContent += imgStr
        this.chatContent += '</br>'
      })
    },
    getHistoryData () {
      this.$emit('getHistory', this.userName, this.currentsid)
    }
  }
}
</script>
<style>
#imChat {
  margin: 20px auto;
  width: 800px;
  height: 600px;
  overflow: hidden;
  border-radius: 3px;
  border:3px solid #263238;
}
#imChat .sidebar,
#imChat .main {
  height: 100%;
}
#imChat .sidebar {
  float: left;
  width: 200px;
  color: #f4f4f4;
  background-color: #2e3238;
}
#imChat .main {
  position: relative;
  overflow: hidden;
  background-color: #eee;
}
#imChat .content {
  /* position: absolute; */
  width: 100%;
  bottom: 0;
  left: 0;
}
#imChat .message {
  height: calc(100% - 180px);
}
ul{
  list-style-type: none; 
  padding: 0px; 
  margin: 0px;
}
.card {
  padding: 12px;
  border-bottom: solid 1px #24272c;
}
.card footer {
  margin-top: 10px;
}
.card .avatar,
.card .name {
  vertical-align: middle;
}
.card .avatar {
  border-radius: 2px;
}
.card .name {
  display: inline-block;
  margin: 0 0 0 15px;
  font-size: 16px;
}
.card .search {
  padding: 0 10px;
  width: 100%;
  font-size: 12px;
  color: #fff;
  height: 30px;
  line-height: 30px;
  border: solid 1px #3a3a3a;
  border-radius: 4px;
  outline: none;
  background-color: #26292e;
}.list li {
  padding: 12px 15px;
  border-bottom: 1px solid #292c33;
  cursor: pointer;
  transition: background-color 0.1s;
}
.list li:hover {
  background-color: rgba(255, 255, 255, 0.03);
}
.list li.active {
  background-color: rgba(255, 255, 255, 0.1);
}
.list .avatar,
.list .name {
  vertical-align: middle;
}
.list .avatar {
  border-radius: 2px;
}
.list .name {
  display: inline-block;
  margin: 0 0 0 15px;
}
.message {
  padding: 10px 15px;
  overflow-y: scroll;
}
.message li {
  margin-bottom: 15px;
}
.message .time {
  margin: 7px 0;
  text-align: center;
}
.message .time > span {
  display: inline-block;
  padding: 0 18px;
  font-size: 12px;
  color: #fff;
  border-radius: 2px;
  background-color: #dcdcdc;
}
.message .avatar {
  float: left;
  margin: 0 10px 0 0;
  border-radius: 3px;
}
.message .text {
  display: inline-block;
  position: relative;
  padding: 0 10px;
  max-width: calc(100% - 40px);
  min-height: 30px;
  line-height: 2.5;
  font-size: 12px;
  text-align: left;
  word-break: break-all;
  background-color: #fafafa;
  border-radius: 4px;
}
.message .text:before {
  content: " ";
  position: absolute;
  top: 9px;
  right: 100%;
  border: 6px solid transparent;
  border-right-color: #fafafa;
}
.message .self {
  text-align: right;
}
.message .self .avatar {
  float: right;
  margin: 0 0 0 10px;
}
.message .self .text {
  background-color: #b2e281;
}
.message .self .text:before {
  right: inherit;
  left: 100%;
  border-right-color: transparent;
  border-left-color: #b2e281;
}
.content {
  height: 160px;
  border-top: solid 1px #ddd;
}
icon-svg path:hover {
  cursor: pointer;
  fill: red;
} 
</style>

