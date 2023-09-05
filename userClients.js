const { Client, Location, List, Buttons } = require('./index');

module.exports = class UserClient {
    /**
     * 构造函数
     * @param {string} key       客户端mapKey唯一索引
     * @param {Object} option    客户端参数
     * class内部的属性clientStatus: 0-初始化中;-1-初始化失败;1-初始化完成待qr扫码登录;2-初始化完成待code验证登录;3-登录完成初始化成功;
     */
    constructor(option) {
        console.log('option:', option);
        if (option.authStrategy && option.authStrategy.clientId) {
            this.key = option.authStrategy.clientId;
        } else {
            throw new Error('启动错误');
        }
        this.client = new Client(option);
        this.clientState = 0;
    }

    async init() {

        this.client.initialize();

        this.client.on('loading_screen', (percent, message) => {
            console.log('LOADING SCREEN', percent, message);
        });
        
        this.client.on('qr', (qr) => {
            // NOTE: This event will not be fired if a session is specified.
            console.log('QR RECEIVED', qr);
        });
        
        this.client.on('device_code', (code) => {
            // NOTE: This event will not be fired if a session is specified.
            console.log('DEVICE CODE RECEIVED', code);
        });
        
        this.client.on('phone_Number_error', (msg) => {
            // NOTE: This event will valid phone number is required.
            console.log('VALID PHONE NUMBER IS REQUIRED', msg);
        });
        
        this.client.on('authenticated', () => {
            console.log('AUTHENTICATED');
        });
        
        this.client.on('auth_failure', (msg) => {
            // Fired if session restore was unsuccessful
            console.error('AUTHENTICATION FAILURE', msg);
        });
        
        this.client.on('ready', () => {
            console.log('READY');
        });

        this.client.on('message', async (msg) => {
            console.log('MESSAGE RECEIVED', msg);
        
            if (msg.body === '!ping reply') {
                // Send a new message as a reply to the current one
                msg.reply('pong');
            } else if (msg.body === '!ping') {
                // Send a new message to the same chat
                this.client.sendMessage(msg.from, 'pong');
            } else if (msg.body.startsWith('!sendto ')) {
                // Direct send a new message to specific id
                let number = msg.body.split(' ')[1];
                let messageIndex = msg.body.indexOf(number) + number.length;
                let message = msg.body.slice(messageIndex, msg.body.length);
                number = number.includes('@c.us') ? number : `${number}@c.us`;
                let chat = await msg.getChat();
                chat.sendSeen();
                this.client.sendMessage(number, message);
            } else if (msg.body.startsWith('!subject ')) {
                // Change the group subject
                let chat = await msg.getChat();
                if (chat.isGroup) {
                    let newSubject = msg.body.slice(9);
                    chat.setSubject(newSubject);
                } else {
                    msg.reply('This command can only be used in a group!');
                }
            } else if (msg.body.startsWith('!echo ')) {
                // Replies with the same message
                msg.reply(msg.body.slice(6));
            } else if (msg.body.startsWith('!desc ')) {
                // Change the group description
                let chat = await msg.getChat();
                if (chat.isGroup) {
                    let newDescription = msg.body.slice(6);
                    chat.setDescription(newDescription);
                } else {
                    msg.reply('This command can only be used in a group!');
                }
            } else if (msg.body === '!leave') {
                // Leave the group
                let chat = await msg.getChat();
                if (chat.isGroup) {
                    chat.leave();
                } else {
                    msg.reply('This command can only be used in a group!');
                }
            } else if (msg.body.startsWith('!join ')) {
                const inviteCode = msg.body.split(' ')[1];
                try {
                    await this.client.acceptInvite(inviteCode);
                    msg.reply('Joined the group!');
                } catch (e) {
                    msg.reply('That invite code seems to be invalid.');
                }
            } else if (msg.body === '!groupinfo') {
                let chat = await msg.getChat();
                if (chat.isGroup) {
                    msg.reply(`
                        *Group Details*
                        Name: ${chat.name}
                        Description: ${chat.description}
                        Created At: ${chat.createdAt.toString()}
                        Created By: ${chat.owner.user}
                        Participant count: ${chat.participants.length}
                    `);
                } else {
                    msg.reply('This command can only be used in a group!');
                }
            } else if (msg.body === '!chats') {
                const chats = await this.client.getChats();
                this.client.sendMessage(msg.from, `The bot has ${chats.length} chats open.`);
            } else if (msg.body === '!info') {
                let info = this.client.info;
                this.client.sendMessage(
                    msg.from,
                    `
                    *Connection info*
                    User name: ${info.pushname}
                    My number: ${info.wid.user}
                    Platform: ${info.platform}
                `
                );
            } else if (msg.body === '!mediainfo' && msg.hasMedia) {
                const attachmentData = await msg.downloadMedia();
                msg.reply(`
                    *Media info*
                    MimeType: ${attachmentData.mimetype}
                    Filename: ${attachmentData.filename}
                    Data (length): ${attachmentData.data.length}
                `);
            } else if (msg.body === '!quoteinfo' && msg.hasQuotedMsg) {
                const quotedMsg = await msg.getQuotedMessage();
        
                quotedMsg.reply(`
                    ID: ${quotedMsg.id._serialized}
                    Type: ${quotedMsg.type}
                    Author: ${quotedMsg.author || quotedMsg.from}
                    Timestamp: ${quotedMsg.timestamp}
                    Has Media? ${quotedMsg.hasMedia}
                `);
            } else if (msg.body === '!resendmedia' && msg.hasQuotedMsg) {
                const quotedMsg = await msg.getQuotedMessage();
                if (quotedMsg.hasMedia) {
                    const attachmentData = await quotedMsg.downloadMedia();
                    this.client.sendMessage(msg.from, attachmentData, {
                        caption: 'Here\'s your requested media.',
                    });
                }
                if (quotedMsg.hasMedia && quotedMsg.type === 'audio') {
                    const audio = await quotedMsg.downloadMedia();
                    await this.client.sendMessage(msg.from, audio, {
                        sendAudioAsVoice: true,
                    });
                }
            } else if (msg.body === '!isviewonce' && msg.hasQuotedMsg) {
                const quotedMsg = await msg.getQuotedMessage();
                if (quotedMsg.hasMedia) {
                    const media = await quotedMsg.downloadMedia();
                    await this.client.sendMessage(msg.from, media, { isViewOnce: true });
                }
            } else if (msg.body === '!location') {
                msg.reply(
                    new Location(37.422, -122.084, 'Googleplex\nGoogle Headquarters')
                );
            } else if (msg.location) {
                msg.reply(msg.location);
            } else if (msg.body.startsWith('!status ')) {
                const newStatus = msg.body.split(' ')[1];
                await this.client.setStatus(newStatus);
                msg.reply(`Status was updated to *${newStatus}*`);
            } else if (msg.body === '!mention') {
                const contact = await msg.getContact();
                const chat = await msg.getChat();
                chat.sendMessage(`Hi @${contact.number}!`, {
                    mentions: [contact],
                });
            } else if (msg.body === '!delete') {
                if (msg.hasQuotedMsg) {
                    const quotedMsg = await msg.getQuotedMessage();
                    if (quotedMsg.fromMe) {
                        quotedMsg.delete(true);
                    } else {
                        msg.reply('I can only delete my own messages');
                    }
                }
            } else if (msg.body === '!pin') {
                const chat = await msg.getChat();
                await chat.pin();
            } else if (msg.body === '!archive') {
                const chat = await msg.getChat();
                await chat.archive();
            } else if (msg.body === '!mute') {
                const chat = await msg.getChat();
                // mute the chat for 20 seconds
                const unmuteDate = new Date();
                unmuteDate.setSeconds(unmuteDate.getSeconds() + 20);
                await chat.mute(unmuteDate);
            } else if (msg.body === '!typing') {
                const chat = await msg.getChat();
                // simulates typing in the chat
                chat.sendStateTyping();
            } else if (msg.body === '!recording') {
                const chat = await msg.getChat();
                // simulates recording audio in the chat
                chat.sendStateRecording();
            } else if (msg.body === '!clearstate') {
                const chat = await msg.getChat();
                // stops typing or recording in the chat
                chat.clearState();
            } else if (msg.body === '!jumpto') {
                if (msg.hasQuotedMsg) {
                    const quotedMsg = await msg.getQuotedMessage();
                    this.client.interface.openChatWindowAt(quotedMsg.id._serialized);
                }
            } else if (msg.body === '!buttons') {
                let button = new Buttons(
                    'Button body',
                    [{ body: 'bt1' }, { body: 'bt2' }, { body: 'bt3' }],
                    'title',
                    'footer'
                );
                this.client.sendMessage(msg.from, button);
            } else if (msg.body === '!list') {
                let sections = [
                    {
                        title: 'sectionTitle',
                        rows: [
                            { title: 'ListItem1', description: 'desc' },
                            { title: 'ListItem2' },
                        ],
                    },
                ];
                let list = new List(
                    'List body',
                    'btnText',
                    sections,
                    'Title',
                    'footer'
                );
                this.client.sendMessage(msg.from, list);
            } else if (msg.body === '!reaction') {
                msg.react('👍');
            } else if (msg.body === '!edit') {
                if (msg.hasQuotedMsg) {
                    const quotedMsg = await msg.getQuotedMessage();
                    if (quotedMsg.fromMe) {
                        quotedMsg.edit(msg.body.replace('!edit', ''));
                    } else {
                        msg.reply('I can only edit my own messages');
                    }
                }
            } else if (msg.body === '!updatelabels') {
                const chat = await msg.getChat();
                await chat.changeLabels([0, 1]);
            } else if (msg.body === '!addlabels') {
                const chat = await msg.getChat();
                let labels = (await chat.getLabels()).map((l) => l.id);
                labels.push('0');
                labels.push('1');
                await chat.changeLabels(labels);
            } else if (msg.body === '!removelabels') {
                const chat = await msg.getChat();
                await chat.changeLabels([]);
            }
        });
        
        this.client.on('message_create', (msg) => {
            // Fired on all message creations, including your own
            if (msg.fromMe) {
                // do stuff here
            }
        });
        
        this.client.on('message_revoke_everyone', async (after, before) => {
            // Fired whenever a message is deleted by anyone (including you)
            console.log(after); // message after it was deleted.
            if (before) {
                console.log(before); // message before it was deleted.
            }
        });
        
        this.client.on('message_revoke_me', async (msg) => {
            // Fired whenever a message is only deleted in your own view.
            console.log(msg.body); // message before it was deleted.
        });
        
        this.client.on('message_ack', (msg, ack) => {
            /*
                == ACK VALUES ==
                ACK_ERROR: -1
                ACK_PENDING: 0
                ACK_SERVER: 1
                ACK_DEVICE: 2
                ACK_READ: 3
                ACK_PLAYED: 4
            */
        
            if (ack == 3) {
                // The message was read
            }
        });
        
        this.client.on('group_join', (notification) => {
            // User has joined or been added to the group.
            console.log('join', notification);
            notification.reply('User joined.');
        });
        
        this.client.on('group_leave', (notification) => {
            // User has left or been kicked from the group.
            console.log('leave', notification);
            notification.reply('User left.');
        });
        
        this.client.on('group_update', (notification) => {
            // Group picture, subject or description has been updated.
            console.log('update', notification);
        });
        
        this.client.on('change_state', (state) => {
            console.log('CHANGE STATE', state);
        });
        
        // Change to false if you don't want to reject incoming calls
        let rejectCalls = true;
        
        this.client.on('call', async (call) => {
            console.log('Call received, rejecting. GOTO Line 261 to disable', call);
            if (rejectCalls) await call.reject();
            await this.client.sendMessage(
                call.from,
                `[${call.fromMe ? 'Outgoing' : 'Incoming'}] Phone call from ${
                    call.from
                }, type ${call.isGroup ? 'group' : ''} ${
                    call.isVideo ? 'video' : 'audio'
                } call. ${
                    rejectCalls
                        ? 'This call was automatically rejected by the script.'
                        : ''
                }`
            );
        });
        
        this.client.on('disconnected', (reason) => {
            console.log('Client was logged out', reason);
        });
        
        this.client.on('contact_changed', async (message, oldId, newId, isContact) => {
            /** The time the event occurred. */
            const eventTime = new Date(message.timestamp * 1000).toLocaleString();
        
            console.log(
                `The contact ${oldId.slice(0, -5)}` +
                    `${
                        !isContact
                            ? ' that participates in group ' +
                              `${
                                  (await this.client.getChatById(message.to ?? message.from))
                                      .name
                              } `
                            : ' '
                    }` +
                    `changed their phone number\nat ${eventTime}.\n` +
                    `Their new phone number is ${newId.slice(0, -5)}.\n`
            );
        
            /**
             * Information about the @param {message}:
             *
             * 1. If a notification was emitted due to a group participant changing their phone number:
             * @param {message.author} is a participant's id before the change.
             * @param {message.recipients[0]} is a participant's id after the change (a new one).
             *
             * 1.1 If the contact who changed their number WAS in the current user's contact list at the time of the change:
             * @param {message.to} is a group chat id the event was emitted in.
             * @param {message.from} is a current user's id that got an notification message in the group.
             * Also the @param {message.fromMe} is TRUE.
             *
             * 1.2 Otherwise:
             * @param {message.from} is a group chat id the event was emitted in.
             * @param {message.to} is @type {undefined}.
             * Also @param {message.fromMe} is FALSE.
             *
             * 2. If a notification was emitted due to a contact changing their phone number:
             * @param {message.templateParams} is an array of two user's ids:
             * the old (before the change) and a new one, stored in alphabetical order.
             * @param {message.from} is a current user's id that has a chat with a user,
             * whos phone number was changed.
             * @param {message.to} is a user's id (after the change), the current user has a chat with.
             */
        });
        
        this.client.on('group_admin_changed', (notification) => {
            if (notification.type === 'promote') {
                /**
                 * Emitted when a current user is promoted to an admin.
                 * {@link notification.author} is a user who performs the action of promoting/demoting the current user.
                 */
                console.log(`You were promoted by ${notification.author}`);
            } else if (notification.type === 'demote')
                /** Emitted when a current user is demoted to a regular user. */
                console.log(`You were demoted by ${notification.author}`);
        });   
    }
    
    async changeAuthType(cCode, cKey, phone) {
        this.client.changeAuthType(cCode, cKey, phone);
    }
};