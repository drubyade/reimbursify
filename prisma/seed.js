"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcryptjs_1 = require("bcryptjs");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var adminPassword, adminUser, group, submitterPassword, submitterUser, templateSchema, formTemplate, existingTrip, trip;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("🌱 Starting database seed...");
                    return [4 /*yield*/, bcryptjs_1.default.hash("admin123", 10)];
                case 1:
                    adminPassword = _a.sent();
                    return [4 /*yield*/, prisma.user.findFirst({
                            where: { email: "admin@iitropar.ac.in" },
                        })];
                case 2:
                    adminUser = _a.sent();
                    if (!!adminUser) return [3 /*break*/, 4];
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                email: "admin@iitropar.ac.in",
                                password: adminPassword,
                                name: "Administrator",
                                username: "admin_iit",
                                role: "ADMINISTRATOR",
                                empCode: "ADM001",
                                designation: "Administrator",
                                department: "Administration",
                            },
                        })];
                case 3:
                    adminUser = _a.sent();
                    _a.label = 4;
                case 4:
                    console.log("\u2713 Admin user created: ".concat(adminUser.email));
                    return [4 /*yield*/, prisma.group.upsert({
                            where: { groupId: "IITRPR_001" },
                            update: {},
                            create: {
                                groupId: "IITRPR_001",
                                secretKey: "SEC_IITRPR_2026",
                                name: "IIT Ropar - Computer Science",
                                description: "Default department group for CS",
                                createdById: adminUser.id,
                            },
                        })];
                case 5:
                    group = _a.sent();
                    console.log("\u2713 Group created: ".concat(group.name));
                    // 3. Make Admin the Head of the Group
                    return [4 /*yield*/, prisma.groupMembership.upsert({
                            where: {
                                groupId_userId: {
                                    groupId: group.id,
                                    userId: adminUser.id,
                                },
                            },
                            update: {},
                            create: {
                                groupId: group.id,
                                userId: adminUser.id,
                                role: "HEAD",
                            },
                        })];
                case 6:
                    // 3. Make Admin the Head of the Group
                    _a.sent();
                    return [4 /*yield*/, bcryptjs_1.default.hash("submitter123", 10)];
                case 7:
                    submitterPassword = _a.sent();
                    return [4 /*yield*/, prisma.user.findFirst({
                            where: { email: "user@iitropar.ac.in" },
                        })];
                case 8:
                    submitterUser = _a.sent();
                    if (!!submitterUser) return [3 /*break*/, 10];
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                email: "user@iitropar.ac.in",
                                password: submitterPassword,
                                name: "Dhruv Yadav",
                                username: "dhruv_yadav",
                                role: "SUBMITTER",
                                empCode: "EMP001",
                                designation: "Research Scholar",
                                department: "Computer Science",
                            },
                        })];
                case 9:
                    submitterUser = _a.sent();
                    _a.label = 10;
                case 10:
                    console.log("\u2713 Submitter user created: ".concat(submitterUser.email));
                    // 5. Add Submitter to the Group as a Member
                    return [4 /*yield*/, prisma.groupMembership.upsert({
                            where: {
                                groupId_userId: {
                                    groupId: group.id,
                                    userId: submitterUser.id,
                                },
                            },
                            update: {},
                            create: {
                                groupId: group.id,
                                userId: submitterUser.id,
                                role: "MEMBER",
                            },
                        })];
                case 11:
                    // 5. Add Submitter to the Group as a Member
                    _a.sent();
                    templateSchema = {
                        fields: [
                            {
                                id: "basic_details",
                                type: "section",
                                title: "Basic Details",
                                fields: [
                                    { id: "name", type: "text", label: "1) Name", required: true },
                                    { id: "emp_code", type: "text", label: "2) Emp. Code", required: true },
                                    { id: "pay_level", type: "text", label: "3) Pay Level" },
                                    { id: "designation", type: "text", label: "4) Designation" },
                                    { id: "department", type: "text", label: "5) Department" },
                                    { id: "advance_drawn", type: "number", label: "6) Advance drawn" },
                                    { id: "advance_date", type: "date", label: "7) Advance drawn date" },
                                    { id: "bank_account", type: "text", label: "8) Bank Account No. (SBI/Any other)" },
                                    { id: "ifsc_code", type: "text", label: "9) IFSC Code" },
                                ],
                            },
                            {
                                id: "journey_purpose",
                                type: "section",
                                title: "Journey Details",
                                fields: [
                                    { id: "purpose", type: "text", label: "10) Purpose of Journey", required: true },
                                    { id: "budget_head", type: "text", label: "11) Budget Head" },
                                ],
                            },
                            {
                                id: "journey_performed",
                                type: "section",
                                title: "12) Details of journey(s) performed: Start to End",
                                fields: [
                                    { id: "dep_date", type: "date", label: "Departure Date" },
                                    { id: "dep_time", type: "time", label: "Departure Time" },
                                    { id: "dep_place", type: "text", label: "Departure Place (From)" },
                                    { id: "arr_date", type: "date", label: "Arrival Date" },
                                    { id: "arr_time", type: "time", label: "Arrival Time" },
                                    { id: "arr_place", type: "text", label: "Arrival Place (To)" },
                                    { id: "distance_km", type: "number", label: "Distance in Kms" },
                                    { id: "travel_mode", type: "select", label: "Mode of Travel", options: ["Air", "Bus", "Train", "Taxi", "Auto"] },
                                    { id: "travel_class", type: "text", label: "Class of Travel" },
                                    { id: "ticket_pnr", type: "text", label: "Ticket No. / PNR No." },
                                    { id: "fare_amount", type: "number", label: "Fare Amount" },
                                ],
                            },
                            {
                                id: "accommodation",
                                type: "section",
                                title: "13) Particulars to be furnished for Accommodation Details",
                                fields: [
                                    { id: "acc_from", type: "date", label: "Period of Stay (From)" },
                                    { id: "acc_to", type: "date", label: "Period of Stay (To)" },
                                    { id: "hotel_name", type: "text", label: "Name and Address of the Hotel/Guest House" },
                                    { id: "hotel_bill", type: "text", label: "Bill No." },
                                    { id: "hotel_days", type: "number", label: "No of Days" },
                                    { id: "hotel_amount", type: "number", label: "Amount paid" },
                                    { id: "breakfast_complementary", type: "select", label: "If Breakfast complementary in Hotel Stay, Please tick", options: ["YES", "NO"] },
                                ],
                            },
                            {
                                id: "daily_allowances",
                                type: "section",
                                title: "14) Daily Allowances",
                                fields: [
                                    { id: "food_breakfast", type: "text", label: "(a) Dates Breakfast provided by Host" },
                                    { id: "food_lunch", type: "text", label: "(a) Dates Lunch provided by Host" },
                                    { id: "food_dinner", type: "text", label: "(a) Dates Dinner provided by Host" },
                                    { id: "da_from", type: "date", label: "(b) DA claim From" },
                                    { id: "da_to", type: "date", label: "(b) DA claim To" },
                                    { id: "da_days", type: "number", label: "(b) No. of Days" },
                                    { id: "leave_taken", type: "select", label: "Whether the claimant was on leave during official Tour", options: ["YES", "NO"] },
                                    { id: "leave_period", type: "text", label: "If yes, please mention the period of Leave" },
                                ],
                            },
                            {
                                id: "other_expenses",
                                type: "section",
                                title: "15) Other expenses incurred in Journey",
                                fields: [
                                    { id: "reg_fee", type: "number", label: "1. Registration Fee for conference /Seminar" },
                                    { id: "visa_ins", type: "number", label: "2. Visa Fees/Insurance charges" },
                                    { id: "other_charges", type: "number", label: "3. Any Other Charges" },
                                ],
                            },
                            {
                                id: "undertaking",
                                type: "section",
                                title: "UNDERTAKING (Air Travel Only)",
                                fields: [
                                    { id: "agent", type: "select", label: "Authorized Travel Agent Used", options: ["M/s Balmer Lawrie & Company Limited (BLCL)", "M/s Ashok Travels & Tours (ATT)", "Indian Railways Catering and Tourism Corporation ltd. (IRCTC)", "Not Applicable"] },
                                ],
                            }
                        ],
                        version: 1,
                        createdAt: new Date().toISOString(),
                    };
                    return [4 /*yield*/, prisma.formTemplate.findFirst({
                            where: {
                                title: "IIT Ropar TA Form",
                                groupId: group.id,
                            },
                        })];
                case 12:
                    formTemplate = _a.sent();
                    if (!!formTemplate) return [3 /*break*/, 14];
                    return [4 /*yield*/, prisma.formTemplate.create({
                            data: {
                                title: "IIT Ropar TA Form",
                                description: "Official Travelling Allowance Reimbursement/Settlement Form",
                                groupId: group.id,
                                createdById: adminUser.id,
                                templateSchema: JSON.stringify(templateSchema),
                                version: 1,
                                isActive: true,
                            },
                        })];
                case 13:
                    _a.sent();
                    console.log("\u2713 Form template created: IIT Ropar TA Form");
                    return [3 /*break*/, 15];
                case 14:
                    console.log("\u2713 Form template already exists: IIT Ropar TA Form");
                    _a.label = 15;
                case 15: return [4 /*yield*/, prisma.trip.findFirst({
                        where: {
                            title: "Conference Visit - Delhi",
                            userId: submitterUser.id,
                        },
                    })];
                case 16:
                    existingTrip = _a.sent();
                    if (!!existingTrip) return [3 /*break*/, 18];
                    return [4 /*yield*/, prisma.trip.create({
                            data: {
                                title: "Conference Visit - Delhi",
                                startDate: new Date("2024-05-15"),
                                userId: submitterUser.id,
                                purpose: "Research conference attendance",
                                budgetHead: "Conference Travel",
                                advanceDrawn: 10000,
                                notes: "3-day conference trip to Delhi",
                            },
                        })];
                case 17:
                    trip = _a.sent();
                    console.log("\u2713 Trip created: ".concat(trip.title));
                    return [3 /*break*/, 19];
                case 18:
                    console.log("\u2713 Trip already exists: Conference Visit - Delhi");
                    _a.label = 19;
                case 19:
                    console.log("✅ Database seeding completed successfully!");
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error("❌ Seed error:", e);
    process.exit(1);
})
    .finally(function () {
    prisma.$disconnect();
});
