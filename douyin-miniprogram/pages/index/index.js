Page({
  data: {
    // 游戏运行的公网访问地址（可替换为你购买配置的自定义域名或当前 Cloud Run 域名）
    gameUrl: 'https://ais-pre-hlxfy74xzfnmb5ltzft6an-205701171224.asia-southeast1.run.app'
  },
  onLoad: function (options) {
    console.log('加载步步为营游戏界面...');
  },
  onShareAppMessage: function () {
    return {
      title: '来和我对战一局步步为营吧！',
      path: '/pages/index/index'
    };
  }
});
