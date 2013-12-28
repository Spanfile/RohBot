
var storage = window.rohStore;

var roomName;
var requestedHistory;
var oldestMessage;

var rohbot = null;
function initializeRohBot() {
	var serverUri = "wss://fpp.literallybrian.com/ws/";
	if (window.location.search == "?noproxy")
		serverUri = "ws://fpp.literallybrian.com:12000/";
	
	rohbot = new RohBot(serverUri); 
	rohbot.onConnected = function() {
		oldestMessage = 0xFFFFFFFF;
		requestedHistory = false;
		
		var room = window.location.hash.substring(1);
		if (storage && storage.getItem("password") !== null) {
			rohbot.login(storage.getItem("name"), storage.getItem("password"), null, room);
		} else if (storage && storage.getItem("tokens") !== null) {
			rohbot.login(storage.getItem("name"), null, storage.getItem("tokens"), room);
		} else {
			rohbot.login("guest", null, null, room);
		}
	};
	
	rohbot.onLogin = function(data) {
		if (storage) {
			storage.setItem("name", data.Name);
			storage.setItem("tokens", data.Tokens);
		}
			
		if (data.Success) {
			$("#header").hide();
			$("#messageBox").removeAttr("disabled");
			$("#messageBox").val("");
			$("#password").val("");
		} else {
			$("#header").show();
			$("#messageBox").attr("disabled","disabled");
			$("#messageBox").val("Guests can not speak.");
		}
		
		$("#chat").scrollTop($("#chat")[0].scrollHeight);
	};
	
	rohbot.onChatHistory = function(data) {
		if (!data.Requested) {
			$("#chat").html("");
			for (var i = 0; i < data.Lines.length; i++) {
				window.chat.addLine(data.Lines[i], data.Requested);
			}
			$("#chat").scrollTop($("#chat")[0].scrollHeight);
		} else {
			var firstMsg = $("#chat :first");
			
			for (var i = data.Lines.length - 1; i >= 0; i--) {
				window.chat.addLine(data.Lines[i], data.Requested);
			}
			
			requestedHistory = false;
			
			var header = $("#header");
			var headerHeight = header.is(":visible") ? header.height() + 10 : 0;
			$("#chat").scrollTop(firstMsg.offset().top - headerHeight - 20);
		}
		
		roomName = data.Name;
		document.title = roomName;
		$("#title").text(roomName);
		oldestMessage = data.OldestLine;
	};
	
	rohbot.onMessage = function(line) {
		if (storage && window.webkitNotifications &&
			window.webkitNotifications.checkPermission() === 0 &&
			line.Type == "chat" && line.Sender != rohbot.name)
		{
			var regexStr = storage.getItem("notify");
			if (regexStr !== null && regexStr.length > 0) {
				try {
					var regex = new RegExp(regexStr, "gim");
					if (regex.test(line.Content)) {
						var notification = window.webkitNotifications.createNotification(
							'rohbot.png',
							roomName,
							htmlDecode(line.Sender) + ": " + htmlDecode(line.Content)
						);
						
						setTimeout(function() {
							notification.close();
						}, 3000);
						
						notification.onclick = function() {
							notification.close();
						}
						
						notification.show();
					}
				} catch (e) {
					console.log(e.message);
				}
			}
		}
		
		window.chat.addLine(line, false);
	};
	
	rohbot.onSysMessage = function(line) {
		line.Type = "state";
		window.chat.addLine(line, false);
	};
	// To add: AvatarFolder and Color
	rohbot.onUserList = function(users) {
		window.chat.statusMessage('In this room:');

		var html = templates.users.render({
			Users: users
				.filter(function(user) { return user.Name !== 'Guest'; })
				.map(function(user)
				{
					// People w/o avatars, use the ? avatar
					if (user.Avatar == "0000000000000000000000000000000000000000")
						user.Avatar = "fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb";
					if (user.Web)
						user.Avatar = false;
					else
						user.AvatarFolder = user.Avatar.substring(0, 2);
					if ( ! user.Playing ) // Explicit falsy = false
						user.Playing = false;
					user.Color = user.Playing ? "ingame" : ( user.Web ? "web" : "" );
					return user;
				})
		});
		window.chat.addHtml(html, false);
	};
	
	rohbot.connect();
}

function linkify(str) {
	str = urlize(str, { target: '_blank' }).replace(/\n/g, '<br/>');
	var res = $("<div/>");
	var e = $("<div/>");
	e.html(str).contents().each(function (i, elem) {
		if (elem.nodeType == 3) {
			res.append(htmlEncode(elem.textContent).replace(/ː(.+?)ː/img, '<img src="/economy/emoticon/$1"/>'));
		} else {
			res.append(elem);
		}
	});
	return res.html();
}

function htmlEncode(html) {
	return document.createElement('a').appendChild(document.createTextNode(html)).parentNode.innerHTML;
}

function htmlDecode(html) {
	var a = document.createElement('a');
	a.innerHTML = html;
	return a.textContent;
}

$(document).ready(function() {
	initializeRohBot();

	window.chat = new ChatManager( rohbot );

	$("#password").keydown(function(e) {
		if (e.keyCode == 13) {
			$("#password").blur().focus();
			$("#loginButton").click();
			return false;
		}
	});
	
	$("#loginButton").click(function() {
		rohbot.login($("#username").val(), $("#password").val(), null);
	});
	
	$("#registerButton").click(function() {
		rohbot.register($("#username").val(), $("#password").val());
	});
	
	$("#chat").scroll(function() {
		if ($("#chat").scrollTop() == 0 && !requestedHistory) {
			rohbot.requestHistory(oldestMessage);
			requestedHistory = true;
		}
	});
	
	$(window).resize(function() {
		$("#chat").scrollTop($("#chat")[0].scrollHeight);
	});
});
