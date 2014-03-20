﻿
class Chat {

    chatMgr: ChatManager;
    name: string;
    shortName: string;
    history: JQuery;
    tab: JQuery;

    private requestedHistory: boolean;
    private oldestLine: number;

    constructor(chatMgr: ChatManager, name: string, shortName: string) {
        this.chatMgr = chatMgr;
        this.name = name;
        this.shortName = shortName;

        this.history = $(templates.history.render({ ShortName: shortName }));
        this.history.appendTo("#history").hide();

        this.tab = $(templates.tab.render({ Name: name, ShortName: shortName }));

        this.tab.click(e => {
            this.chatMgr.switchTo(this.shortName);
            return false;
        });

        var tabClose = this.tab.find(".tab-close");

        if (shortName == "home") {
            tabClose.hide();
        } else {
            tabClose.click(e => {
                this.chatMgr.rohbot.sendMessage(this.shortName, "/leave " + this.shortName);
                return false;
            });
        }

        this.tab.appendTo("#tabs");

        this.requestedHistory = false;
        this.oldestLine = 0xFFFFFFFF;
    }

    destroy() {
        if (this.shortName == "home")
            return;
        
        this.history.remove();
        this.tab.remove();
    }

    requestHistory() {
        if (this.requestedHistory)
            return;

        this.requestedHistory = true;
        this.chatMgr.rohbot.requestHistory(this.shortName, this.oldestLine);
    }

    addHistory(data: any) {
        var history: any[] = data.Lines;

        if (!data.Requested) {
            this.history.empty();

            for (var i = 0; i < history.length; i++) {
                this.addLine(history[i], false);
            }

            if (this.isActive())
                this.chatMgr.scrollToBottom();
        } else {
            var firstMsg = this.history.find(":first")[0];

            for (var i = history.length - 1; i >= 0; i--) {
                this.addLine(history[i], true);
            }

            this.requestedHistory = false;


            if (this.isActive())
                this.chatMgr.scrollTo(firstMsg.offsetTop);
        }

        this.oldestLine = data.OldestLine;
    }

    statusMessage(message: string) {
        this.addLine({
            Type: "state",
            Date: Date.now() / 1000,
            Content: message
        });
    }

    addLine(line: any, prepend: boolean = false) {
        var date = new Date(line.Date * 1000);

        var data: any = {
            Time: Chat.formatTime(date),
            DateTime: date.toISOString(),
            Message: line.Content
        };

        switch (line.Type) {
            case "chat": {
                var senderClasses = "";

                if (line.UserType == "RohBot")
                    senderClasses = "rohBot " + line.SenderStyle;
                else if (line.InGame)
                    senderClasses = "inGame";

                data.Sender = line.Sender;
                data.SenderClasses = senderClasses;
                data.Message = this.linkify(line.Content);
                break;
            }

            case "state":
                break;

            default:
                console.error("unsupported line type", line);
                break;
        }

        this.addHtml(templates.message.render(data), prepend);
    }

    addHtml(html: string, prepend: boolean = false) {
        var historyElem = $("#history")[0];
        var atBottom = historyElem.clientHeight >= (historyElem.scrollHeight - historyElem.scrollTop - 32);

        if (prepend)
            this.history.prepend(html);
        else
            this.history.append(html);

        if (this.isActive && !prepend && atBottom)
            this.chatMgr.scrollToBottom();
    }

    private isActive() {
        return this.chatMgr.getCurrentChat().shortName == this.shortName;
    }

    private linkify(text: string) {
        // Put spaces infront of <s to stop urlize seizing them as urls
        text = text.replace(/ː(\w+?)ː/g, ' ː<img src="/economy/emoticon/$1" alt="$1" class="emote">');
        text = urlize(text, { target: "_blank" });
        text = text.replace('\n', ' <br>'); // whitespace infront of a <br> isn't noticable
        text = text.replace(/\ ː/g, ''); // Get rid of the sentinel chars. (triangle colons are guaranteed to never appear in normal text)
        return text;
    }

    static formatTime(date: Date) {
        var hours: any = date.getHours();
        var minutes: any = date.getMinutes();
        var military = RohStore.get("clock format") == "24hr";
        var suffix = "";

        if (military) {
            if (hours < 10)
                hours = '0' + hours;
        } else {
            suffix = "AM";
            if (hours >= 12) {
                suffix = "PM";
                hours -= 12;
            }

            if (hours == 0)
                hours = 12;

            if (hours < 10)
                hours = " " + hours;
        }

        if (minutes < 10)
            minutes = "0" + minutes;

        if (military)
            return hours + ":" + minutes;
        else
            return hours + ":" + minutes + " " + suffix;
    }
}