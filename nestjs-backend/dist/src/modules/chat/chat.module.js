"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const chat_gateway_1 = require("./chat.gateway");
const chat_controller_1 = require("./chat.controller");
const chat_service_1 = require("./chat.service");
const chat_message_entity_1 = require("./chat-message.entity");
const user_entity_1 = require("../users/user.entity");
const moderation_module_1 = require("../moderation/moderation.module");
const user_blocks_module_1 = require("../user-blocks/user-blocks.module");
const ai_module_1 = require("../ai/ai.module");
const notifications_module_1 = require("../notifications/notifications.module");
const system_settings_module_1 = require("../system-settings/system-settings.module");
let ChatModule = class ChatModule {
};
exports.ChatModule = ChatModule;
exports.ChatModule = ChatModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([chat_message_entity_1.ChatMessage, user_entity_1.User]),
            moderation_module_1.ModerationModule,
            user_blocks_module_1.UserBlocksModule,
            ai_module_1.AiModule,
            notifications_module_1.NotificationsModule,
            system_settings_module_1.SystemSettingsModule,
        ],
        controllers: [chat_controller_1.ChatController],
        providers: [chat_gateway_1.ChatGateway, chat_service_1.ChatService],
    })
], ChatModule);
//# sourceMappingURL=chat.module.js.map