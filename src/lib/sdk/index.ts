import { identity } from "./domains/identity";
import { registry } from "./domains/registry";
import { container } from "./domains/container";
import { authority } from "./domains/authority";
import { capability } from "./domains/capability";
import { provisioning } from "./domains/provisioning";
import { form } from "./domains/form";
import { communication } from "./domains/communication";
import { payment } from "./domains/payment";
import { subscription } from "./domains/subscription";
import { surfacing } from "./domains/surfacing";
import { avatars } from "./domains/avatars";
import { inventory } from "./domains/inventory";
import { events } from "./domains/events";
import { paymentGateway } from "./domains/paymentGateway";
import { paymentReporting } from "./domains/paymentReporting";
import { order } from "./domains/order";
import { fulfillment } from "./domains/fulfillment";
import { logistics } from "./domains/logistics";
import { projects } from "./domains/projects";
import { hr } from "./domains/hr";
import { crm } from "./domains/crm";  
import { templateLibrary } from "./domains/templateLibrary";
import { inventoryCatalog } from "./domains/inventoryCatalog";
import { finance } from "./domains/finance";
import { pos } from "./domains/pos";
import { customerCredit } from "./domains/customerCredit";
import { retailFinanceSetup } from "./domains/retailFinanceSetup";
import { educationAcademic } from "./domains/educationAcademic";
import { educationEnrollment } from "./domains/educationEnrollment";
import { educationAdmissions } from "./domains/educationAdmissions";
import { educationAttendance } from "./domains/educationAttendance";
import { educationAssessment } from "./domains/educationAssessment";
import { quiz } from "./domains/quiz";
import { quizPresentation } from "./domains/quizPresentation";
import { quizGamification } from "./domains/quizGamification";
import { quizPools } from "./domains/quizPools";
import { quizAdaptive } from "./domains/quizAdaptive";
/**
 * Single entry point for every domain's API client.
 *
 * Usage: `sdk.identity.login(...)`, `sdk.registry.listAssets(...)`.
 *
 * Adding a new domain: drop a new file in `domains/`, export a plain
 * object of typed functions (use `domains/identity.ts` or
 * `domains/registry.ts` as a template, and see `README.md` for the
 * conventions), then add it below.
 */
export const sdk = {
  identity,
  registry,
  container,
  authority,
  capability,
  provisioning,
  form,
  communication,
  payment,
  subscription,
  surfacing,
  avatars,
  inventory,
  events,
  paymentGateway,
  paymentReporting,
  order,
  fulfillment,
  logistics,
  projects,
  hr,
    crm,
    templateLibrary,
    inventoryCatalog,
    finance,
    pos,
    customerCredit,
    retailFinanceSetup,
    educationAcademic, educationEnrollment, educationAdmissions, educationAttendance, educationAssessment,
    quiz, quizPresentation, quizGamification, quizPools, quizAdaptive
};

export type { TransactionKind } from "./domains/customerCredit";

export type { Actor, AuthSession, ListActorsParams } from "./domains/identity";
export type { RegistryAsset } from "./domains/registry";
export type {
  Container,
  Membership,
  ContainerKind,
  Invitation,
  JoinRequest,
  ContainerPolicy,
  SearchContainersParams,
} from "./domains/container";
export type {
  AccessMode as AuthorityAccessMode,
  AuthorizationDecision,
  FeatureLicense,
  RoleAssignment,
  Role,
} from "./domains/authority";
export type {
  CapabilityManifest,
  CapabilityNav,
  CapabilityRole,
} from "./domains/capability";
export type {
  AccessMode,
  Visibility,
  TemplateCapability,
  ContainerTemplate,
  TemplateChildEdge,
  InstantiatedContainer,
  InstantiationRequest,
  InstantiateResult,
  TemplateInput,
} from "./domains/provisioning";
export type {
  FieldType,
  Choice,
  FieldConfig,
  FormField,
  FormRecord,
  FormAnswer,
  FormResponseRecord,
  FieldInput,
  CreateFormInput,
  UpdateFormInput,
  AnswerInput,
} from "./domains/form";
export { FormValidationError } from "./domains/form";
export type {
  ConversationType,
  ParticipantRole,
  ConversationStatus,
  ParticipantStatus,
  Conversation,
  Participant,
  Message as CommunicationMessage,
  Reaction as CommunicationReaction,
} from "./domains/communication";
export type {
  WalletOwnerType,
  WalletParticipantRole,
  Gateway,
  PaymentIntentStatus,
  LedgerTransactionKind,
  Wallet,
  WalletParticipant,
  PaymentIntent,
  LedgerTransaction,
  InitiateResult,
  CreateIntentInput,
  CreateTransferInput,
} from "./domains/payment";
export type {
  WalletReport,
  TransactionReport,
  LedgerEntryReport,
  PlatformPaymentSummary,
} from "./domains/paymentReporting";
export type {
  BillingInterval,
  PlanStatus,
  SubscriptionStatus,
  SubscriptionPlan,
  Subscription,
  CreatePlanInput,
  UpdatePlanInput,
} from "./domains/subscription";
export type {
  ListingStatus,
  PricingMode,
  VisibilityScope,
  PurchaseStatus,
  Listing,
  Purchase,
  ListingCategory,
  CreateListingInput,
  UpdateListingInput,
} from "./domains/surfacing";
export type {
  InventoryItemStatus,
  OwnershipShape,
  ParticipantRole as InventoryParticipantRole,
  ParticipantStatus as InventoryParticipantStatus,
  InventoryPrice,
  BrandingAsset,
  ItemOwnership,
  InventoryItem,
  Participant as InventoryParticipant,
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
} from "./domains/inventory";
export type {
  EventStatus,
  AttendeeStatus,
  EventOwnershipShape,
  EventParticipantRole,
  EventParticipantStatus,
  EventPrice,
  EventBrandingAsset,
  EventOwnership,
  EventItem,
  Attendee,
  EventParticipant,
  CreateEventInput,
  UpdateEventInput,
} from "./domains/events";
export type {
  OrderStatus,
  OrderLineResult,
  Order,
  CartLineInput,
  CreateOrderInput,
} from "./domains/order";
export type {
  FulfillmentType,
  FulfillmentStatus,
  Fulfillment,
} from "./domains/fulfillment";
export type {
  ShipmentStatus,
  ShipmentEventStatus,
  Shipment,
  ShipmentEvent,
} from "./domains/logistics";
