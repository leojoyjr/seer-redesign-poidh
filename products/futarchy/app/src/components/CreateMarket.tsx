import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { organizations } from '../data/milestones';
import { orgAvatars } from '../data/avatars';
import { Avatar } from './Avatar';
import { backToLanding } from '../router';
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconExternal,
  IconFailLine,
  IconFork,
  IconInfo,
  IconPassLine,
  IconPlus,
} from './icons';
import '../styles/overlays.css';

const TOKENS = ['GNO', 'ETH', 'PNK', 'AAVE', 'USDS'] as const;
const CHAINS = ['Gnosis', 'Ethereum', 'Arbitrum'] as const;
const NEW = '__new';
const DRAFT_KEY = 'seer:create-market:draft';
const SEED_KEY = 'seer:create-market:seed';
const STEP_LABELS = ['Ask', 'Conditions', 'Market', 'Review'] as const;

type Form = {
  org: string;
  newOrg: string;
  title: string;
  desc: string;
  token: string;
  metric: string;
  chain: string;
  passCondition: string;
  failCondition: string;
  resolutionSource: string;
  date: string;
  resolutionDate: string;
  initialLiquidity: string;
  fee: string;
};

const FIELD_STEPS: readonly (readonly (keyof Form)[])[] = [
  ['org', 'newOrg', 'title', 'desc', 'token', 'metric', 'chain'],
  [
    'passCondition',
    'failCondition',
    'resolutionSource',
    'date',
    'resolutionDate',
  ],
  ['initialLiquidity', 'fee'],
  [],
];

const FORM_FIELD_ORDER: readonly (keyof Form)[] = [
  'org',
  'newOrg',
  'title',
  'desc',
  'token',
  'metric',
  'chain',
  'passCondition',
  'failCondition',
  'resolutionSource',
  'date',
  'resolutionDate',
  'initialLiquidity',
  'fee',
];

const isConnected = () => !!document.querySelector('.sg-connect.sg-on');

const day = (offset: number) => {
  const date = new Date(Date.now() + offset * 864e5);
  return date.toISOString().slice(0, 10);
};

const dayAfter = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

const initialForm = (): Form => ({
  org: '',
  newOrg: '',
  title: '',
  desc: '',
  token: 'GNO',
  metric: 'GNO price in USDS',
  chain: 'Gnosis',
  passCondition: 'The proposal passes its governance vote.',
  failCondition: 'The proposal fails its governance vote.',
  resolutionSource: 'DAO governance result',
  date: '',
  resolutionDate: day(8),
  initialLiquidity: '1000',
  fee: '2',
});

function readRestoredDraft(): { form: Form; step: number } {
  const fallback = initialForm();

  if (typeof window === 'undefined') {
    return { form: fallback, step: 0 };
  }

  let restored = fallback;
  let restoredStep = 0;
  let hasDraft = false;

  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);

    if (raw) {
      const parsed: unknown = JSON.parse(raw);

      if (typeof parsed === 'object' && parsed !== null) {
        const record = parsed as Record<string, unknown>;
        const source =
          typeof record.form === 'object' && record.form !== null
            ? (record.form as Record<string, unknown>)
            : record;
        const next = { ...fallback };

        for (const key of Object.keys(fallback) as (keyof Form)[]) {
          const value = source[key];
          if (typeof value === 'string') next[key] = value;
        }

        restored = next;
        hasDraft = true;

        if (
          typeof record.step === 'number' &&
          Number.isInteger(record.step)
        ) {
          restoredStep = Math.max(0, Math.min(3, record.step));
        }
      }
    }
  } catch {
    hasDraft = false;
  }

  try {
    const seed = window.sessionStorage.getItem(SEED_KEY);
    window.sessionStorage.removeItem(SEED_KEY);

    if (!hasDraft && seed?.trim()) {
      restored = {
        ...restored,
        title: seed.trim().slice(0, 60),
      };
    }
  } catch {
    // Session storage is optional.
  }

  return { form: restored, step: restoredStep };
}

function validate(form: Form) {
  const errors: Partial<Record<keyof Form, string>> = {};

  if (form.org === NEW ? form.newOrg.trim().length < 2 : !form.org) {
    errors[form.org === NEW ? 'newOrg' : 'org'] =
      form.org === NEW
        ? 'Enter an organization name (2+ characters).'
        : 'Choose an organization.';
  }

  if (form.title.trim().length < 4) {
    errors.title = 'Enter a proposal title (4+ characters).';
  }

  if (form.desc.trim().length < 10) {
    errors.desc = 'Add a short description (10+ characters).';
  }

  if (!form.token) errors.token = 'Choose a collateral token.';
  if (!form.chain) errors.chain = 'Choose a chain.';

  if (form.metric.trim().length < 4) {
    errors.metric = 'Describe the success metric (4+ characters).';
  }

  if (form.passCondition.trim().length < 4) {
    errors.passCondition = 'Define what counts as PASS.';
  }

  if (form.failCondition.trim().length < 4) {
    errors.failCondition = 'Define what counts as FAIL.';
  }

  if (form.resolutionSource.trim().length < 4) {
    errors.resolutionSource = 'Name the resolution source.';
  }

  if (!form.date) {
    errors.date = 'Pick a closing date.';
  } else if (form.date < day(1)) {
    errors.date = 'Closing date must be tomorrow or later.';
  }

  if (!form.resolutionDate) {
    errors.resolutionDate = 'Pick a resolution date.';
  } else if (form.date && form.resolutionDate <= form.date) {
    errors.resolutionDate =
      'The close time must be before the resolution time. Choose a later resolution time.';
  }

  const liquidity = Number(form.initialLiquidity);
  if (!Number.isFinite(liquidity) || liquidity <= 0) {
    errors.initialLiquidity = 'Enter initial liquidity greater than zero.';
  }

  const fee = Number(form.fee);
  if (!Number.isFinite(fee) || fee < 0 || fee > 10) {
    errors.fee = 'Choose a fee from 0 to 10 percent.';
  }

  return errors;
}

function fieldStep(key: keyof Form) {
  return FIELD_STEPS.findIndex(fields =>
    (fields as readonly (keyof Form)[]).includes(key),
  );
}

function formatDate(value: string) {
  if (!value) return 'Not set';

  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="ov-field">
      <label className="ov-field__label" htmlFor={id}>
        <span>{label}</span>
        <span className="ov-field__required" aria-hidden="true">
          Required
        </span>
      </label>
      {children}
      <p
        className={`ov-field__message${
          error ? ' ov-field__message--error' : ''
        }`}
        id={`${id}-msg`}
        role={error ? 'alert' : undefined}
      >
        {error && <IconInfo width={16} height={16} />}
        <span>{error ?? hint ?? ''}</span>
      </p>
    </div>
  );
}

export function CreateMarket() {
  const restored = useMemo(() => readRestoredDraft(), []);
  const [form, setForm] = useState<Form>(restored.form);
  const [step, setStep] = useState(restored.step);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [attemptedSteps, setAttemptedSteps] = useState<Set<number>>(
    new Set(),
  );
  const [submitted, setSubmitted] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [prompted, setPrompted] = useState(false);

  const initialFormSnapshot = JSON.stringify(restored.form);
  const initialDraftSnapshot = JSON.stringify({
    form: restored.form,
    step: restored.step,
  });
  const [lastSavedForm, setLastSavedForm] = useState(initialFormSnapshot);
  const [lastSavedDraft, setLastSavedDraft] = useState(
    initialDraftSnapshot,
  );

  const errors = useMemo(() => validate(form), [form]);
  const formSnapshot = useMemo(() => JSON.stringify(form), [form]);
  const draftSnapshot = useMemo(
    () => JSON.stringify({ form, step }),
    [form, step],
  );
  const dirty = formSnapshot !== lastSavedForm;
  const saving = draftSnapshot !== lastSavedDraft;

  useEffect(() => {
    if (done || draftSnapshot === lastSavedDraft) return;

    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, draftSnapshot);
      } catch {
        // Local storage is optional.
      }

      setLastSavedDraft(draftSnapshot);
      setLastSavedForm(formSnapshot);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [
    done,
    draftSnapshot,
    formSnapshot,
    lastSavedDraft,
  ]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !event.defaultPrevented &&
        !document.querySelector('dialog[open]')
      ) {
        event.preventDefault();

        if (
          !dirty ||
          window.confirm('Discard unsaved changes and leave create market?')
        ) {
          backToLanding();
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!prompted) return;

    const timer = window.setInterval(() => {
      if (isConnected()) setPrompted(false);
    }, 400);

    return () => clearInterval(timer);
  }, [prompted]);

  const set = (key: keyof Form, value: string) => {
    setForm(previous => ({ ...previous, [key]: value }));
  };

  const show = (key: keyof Form) =>
    touched.has(key) ||
    submitted ||
    attemptedSteps.has(fieldStep(key))
      ? errors[key]
      : undefined;

  const blur = (key: keyof Form) => () => {
    setTouched(previous => new Set(previous).add(key));
  };

  const aria = (key: keyof Form) => ({
    id: `cm-${key}`,
    required: true,
    'aria-required': true,
    'aria-invalid': !!show(key),
    'aria-describedby': `cm-${key}-msg`,
    onBlur: blur(key),
  });

  const canLeave = () =>
    !dirty ||
    window.confirm('Discard unsaved changes and leave create market?');

  const orgName =
    form.org === NEW
      ? form.newOrg.trim()
      : organizations.find(organization => organization.slug === form.org)
          ?.name ?? '';
  const title = form.title.trim() || 'Your proposal';
  const closes = formatDate(form.date);
  const resolves = formatDate(form.resolutionDate);
  const valid = Object.keys(errors).length === 0;

  const stepComplete = FIELD_STEPS.map(
    fields => !fields.some(key => errors[key]),
  );

  const focusField = (key: keyof Form) => {
    requestAnimationFrame(() => {
      document.getElementById(`cm-${key}`)?.focus();
    });
  };

  const continueWizard = () => {
    setAttemptedSteps(previous => new Set(previous).add(step));

    const fields = FIELD_STEPS[step] ?? [];
    const firstInvalid = fields.find(key => errors[key]);

    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }

    setStep(current => Math.min(3, current + 1));
  };

  const updateCloseDate = (value: string) => {
    setForm(previous => ({
      ...previous,
      date: value,
      resolutionDate:
        value &&
        (!previous.resolutionDate || previous.resolutionDate <= value)
          ? dayAfter(value)
          : previous.resolutionDate,
    }));
  };

  const submit = () => {
    setSubmitted(true);

    if (!valid) {
      const firstInvalid = FORM_FIELD_ORDER.find(key => errors[key]);

      if (firstInvalid) {
        const invalidStep = fieldStep(firstInvalid);
        if (invalidStep >= 0) setStep(invalidStep);
        focusField(firstInvalid);
      }
      return;
    }

    if (!isConnected()) {
      setPrompted(true);
      window.dispatchEvent(new Event('seer:connect'));
      return;
    }

    let hash = 0;
    for (const character of JSON.stringify(form)) {
      hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    }

    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Local storage is optional.
    }

    setLastSavedForm(formSnapshot);
    setLastSavedDraft(draftSnapshot);
    setDone(
      `0x${hash.toString(16).padStart(8, '0')}a41c07e9d25b3f68c0e1`,
    );
  };

  return (
    <div className="ov-create">
      <nav
        className="ov-create__breadcrumb"
        data-align
        aria-label="Breadcrumb"
      >
        <button
          type="button"
          className="ov-icon-button"
          aria-label="Back"
          onClick={() => {
            if (canLeave()) backToLanding();
          }}
        >
          <IconArrowLeft width={20} height={20} />
        </button>
        <a
          href="#/"
          onClick={event => {
            if (!canLeave()) event.preventDefault();
          }}
        >
          Milestones
        </a>
        <IconArrowRight width={16} height={16} aria-hidden="true" />
        <span aria-current="page">Create market</span>
      </nav>

      <header data-align className="ov-create__header">
        <div>
          <h1>Create a conditional market</h1>
          <p>
            PASS and FAIL markets forecast the token price under each
            outcome. Their GAP is the signal. The DAO still decides.
          </p>
        </div>
        {!done && (
          <span
            className="ov-create__save-state"
            role="status"
            aria-live="polite"
          >
            {saving ? 'Saving draft' : 'Draft saved'}
          </span>
        )}
      </header>

      {!done && (
        <section
          className="ov-create__progress"
          aria-label="Creation progress"
        >
          <div
            className="ov-create__progress-head"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            Step {step + 1} of 4
          </div>
          <div className="ov-create__progress-track" aria-hidden="true">
            <i style={{ transform: `scaleX(${step / 3})` }} />
          </div>
          <ol className="ov-create__steps">
            {STEP_LABELS.map((label, index) => {
              const completed = index < step && stepComplete[index];

              return (
                <li
                  className="ov-create__step-label"
                  aria-current={index === step ? 'step' : undefined}
                  data-ok={completed}
                  key={label}
                >
                  {completed ? (
                    <>
                      <IconCheck width={16} height={16} />
                      <span className="ov-sr-only">Completed</span>
                    </>
                  ) : (
                    <span
                      className="ov-create__step-number"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                  )}
                  <span>{label}</span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <div data-align className="ov-create__grid">
        {done ? (
          <section
            className="ov-create__success"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="ov-create__success-heading">
              <IconCheck width={24} height={24} />
              <h2>Market submitted</h2>
            </div>
            <p>Demo only. Nothing was sent to the network.</p>
            <dl>
              <div>
                <dt>Organization</dt>
                <dd>{orgName}</dd>
              </div>
              <div>
                <dt>Proposal</dt>
                <dd>{title}</dd>
              </div>
              <div>
                <dt>Markets</dt>
                <dd>2 (pass and fail)</dd>
              </div>
              <div>
                <dt>Collateral</dt>
                <dd>{form.token}</dd>
              </div>
              <div>
                <dt>Closes</dt>
                <dd>{closes}</dd>
              </div>
              <div>
                <dt>Transaction</dt>
                <dd className="ov-create__hash">
                  {done.slice(0, 10)}...{done.slice(-6)}
                </dd>
              </div>
            </dl>
            <div className="ov-create__success-actions">
              <a
                className="ov-button ov-button--primary"
                href="#/"
              >
                <IconArrowLeft width={16} height={16} />
                Back to milestones
              </a>
              <button
                type="button"
                className="ov-button ov-button--secondary"
                onClick={() => {
                  setDone(null);
                  setSubmitted(false);
                  setStep(0);
                }}
              >
                <IconPlus width={16} height={16} />
                Create another
              </button>
            </div>
          </section>
        ) : (
          <form
            className="ov-create__form"
            noValidate
            onSubmit={event => {
              event.preventDefault();

              if (step < 3) {
                continueWizard();
              } else {
                submit();
              }
            }}
          >
            <section className="ov-create__panel">
              {submitted && !valid && (
                <div
                  className="ov-create__error-summary"
                  role="alert"
                  tabIndex={-1}
                >
                  <IconInfo width={20} height={20} />
                  <span>
                    Review the highlighted fields before creating the
                    market.
                  </span>
                </div>
              )}

              {step === 0 && (
                <fieldset className="ov-create__fieldset" key="ask">
                  <legend className="ov-create__legend">Ask</legend>
                  <p className="ov-create__step-copy">
                    Name the proposal, the DAO asking the question, and the
                    token being forecast.
                  </p>

                  <Field
                    id="cm-org"
                    label="Organization"
                    error={show('org')}
                  >
                    <select
                      className="ov-field__control"
                      {...aria('org')}
                      value={form.org}
                      onChange={event => set('org', event.target.value)}
                    >
                      <option value="">Select an organization</option>
                      {organizations.map(organization => (
                        <option
                          key={organization.slug}
                          value={organization.slug}
                        >
                          {organization.name}
                        </option>
                      ))}
                      <option value={NEW}>New organization</option>
                    </select>
                  </Field>

                  {form.org === NEW && (
                    <Field
                      id="cm-newOrg"
                      label="New organization name"
                      error={show('newOrg')}
                    >
                      <input
                        className="ov-field__control"
                        {...aria('newOrg')}
                        value={form.newOrg}
                        maxLength={40}
                        onChange={event =>
                          set('newOrg', event.target.value)
                        }
                      />
                    </Field>
                  )}

                  {form.org && form.org !== NEW && (
                    <p className="ov-create__org">
                      <Avatar avatar={orgAvatars[form.org]} size={24} />
                      {orgName}
                    </p>
                  )}

                  <Field
                    id="cm-title"
                    label="Proposal title"
                    error={show('title')}
                    hint="Use the proposal identifier or title."
                  >
                    <input
                      className="ov-field__control"
                      {...aria('title')}
                      value={form.title}
                      maxLength={60}
                      placeholder="GIP-154"
                      onChange={event => set('title', event.target.value)}
                    />
                  </Field>

                  <Field
                    id="cm-desc"
                    label="Short description"
                    error={show('desc')}
                    hint={`${form.desc.length}/160`}
                  >
                    <textarea
                      className="ov-field__control"
                      {...aria('desc')}
                      value={form.desc}
                      maxLength={160}
                      rows={4}
                      onChange={event => set('desc', event.target.value)}
                    />
                  </Field>

                  <div className="ov-create__row">
                    <Field
                      id="cm-token"
                      label="Collateral token"
                      error={show('token')}
                    >
                      <select
                        className="ov-field__control"
                        {...aria('token')}
                        value={form.token}
                        onChange={event =>
                          setForm(previous => ({
                            ...previous,
                            token: event.target.value,
                            metric:
                              previous.metric ===
                              `${previous.token} price in USDS`
                                ? `${event.target.value} price in USDS`
                                : previous.metric,
                          }))
                        }
                      >
                        {TOKENS.map(token => (
                          <option key={token}>{token}</option>
                        ))}
                      </select>
                    </Field>

                    <Field
                      id="cm-chain"
                      label="Chain"
                      error={show('chain')}
                    >
                      <select
                        className="ov-field__control"
                        {...aria('chain')}
                        value={form.chain}
                        onChange={event =>
                          set('chain', event.target.value)
                        }
                      >
                        {CHAINS.map(chain => (
                          <option key={chain}>{chain}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field
                    id="cm-metric"
                    label="Success metric"
                    error={show('metric')}
                  >
                    <input
                      className="ov-field__control"
                      {...aria('metric')}
                      value={form.metric}
                      maxLength={60}
                      onChange={event => set('metric', event.target.value)}
                    />
                  </Field>
                </fieldset>
              )}

              {step === 1 && (
                <fieldset
                  className="ov-create__fieldset"
                  key="conditions"
                >
                  <legend className="ov-create__legend">Conditions</legend>
                  <p className="ov-create__step-copy">
                    Define PASS and FAIL so traders and the resolving oracle
                    read the same conditions.
                  </p>

                  <Field
                    id="cm-passCondition"
                    label="PASS condition"
                    error={show('passCondition')}
                  >
                    <textarea
                      className="ov-field__control"
                      {...aria('passCondition')}
                      value={form.passCondition}
                      maxLength={240}
                      rows={4}
                      onChange={event =>
                        set('passCondition', event.target.value)
                      }
                    />
                  </Field>

                  <Field
                    id="cm-failCondition"
                    label="FAIL condition"
                    error={show('failCondition')}
                  >
                    <textarea
                      className="ov-field__control"
                      {...aria('failCondition')}
                      value={form.failCondition}
                      maxLength={240}
                      rows={4}
                      onChange={event =>
                        set('failCondition', event.target.value)
                      }
                    />
                  </Field>

                  <Field
                    id="cm-resolutionSource"
                    label="Resolution source"
                    error={show('resolutionSource')}
                  >
                    <input
                      className="ov-field__control"
                      {...aria('resolutionSource')}
                      value={form.resolutionSource}
                      maxLength={120}
                      onChange={event =>
                        set('resolutionSource', event.target.value)
                      }
                    />
                  </Field>

                  <div className="ov-create__row">
                    <Field
                      id="cm-date"
                      label="Closing date"
                      error={show('date')}
                      hint="Markets close at 00:00 UTC."
                    >
                      <input
                        className="ov-field__control"
                        type="date"
                        {...aria('date')}
                        min={day(1)}
                        value={form.date}
                        onChange={event =>
                          updateCloseDate(event.target.value)
                        }
                      />
                    </Field>

                    <Field
                      id="cm-resolutionDate"
                      label="Resolution date"
                      error={show('resolutionDate')}
                      hint="Resolution begins at 00:00 UTC."
                    >
                      <input
                        className="ov-field__control"
                        type="date"
                        {...aria('resolutionDate')}
                        min={form.date ? dayAfter(form.date) : day(2)}
                        value={form.resolutionDate}
                        onChange={event =>
                          set('resolutionDate', event.target.value)
                        }
                      />
                    </Field>
                  </div>
                </fieldset>
              )}

              {step === 2 && (
                <fieldset className="ov-create__fieldset" key="market">
                  <legend className="ov-create__legend">Market</legend>
                  <p className="ov-create__step-copy">
                    Set the opening liquidity and review the market
                    parameters.
                  </p>

                  <dl className="ov-create__market-context">
                    <div>
                      <dt>Collateral</dt>
                      <dd>{form.token}</dd>
                    </div>
                    <div>
                      <dt>Chain</dt>
                      <dd>{form.chain}</dd>
                    </div>
                  </dl>

                  <Field
                    id="cm-initialLiquidity"
                    label="Initial liquidity"
                    error={show('initialLiquidity')}
                    hint={`Amount in ${form.token}.`}
                  >
                    <input
                      className="ov-field__control"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      {...aria('initialLiquidity')}
                      value={form.initialLiquidity}
                      onChange={event =>
                        set('initialLiquidity', event.target.value)
                      }
                    />
                  </Field>

                  <details className="ov-create__advanced">
                    <summary className="ov-disclosure">
                      <span>Advanced settings</span>
                      <IconChevronDown width={16} height={16} />
                    </summary>
                    <div className="ov-create__advanced-content">
                      <Field
                        id="cm-fee"
                        label="Market fee"
                        error={show('fee')}
                        hint="Percentage charged on each trade."
                      >
                        <select
                          className="ov-field__control"
                          {...aria('fee')}
                          value={form.fee}
                          onChange={event =>
                            set('fee', event.target.value)
                          }
                        >
                          <option value="0">0%</option>
                          <option value="1">1%</option>
                          <option value="2">2%</option>
                          <option value="3">3%</option>
                          <option value="5">5%</option>
                        </select>
                      </Field>
                    </div>
                  </details>
                </fieldset>
              )}

              {step === 3 && (
                <fieldset className="ov-create__fieldset" key="review">
                  <legend className="ov-create__legend">Review</legend>

                  <p className="ov-create__review-lead">
                    Creating {orgName ? <b>{orgName}</b> : 'a market'}:{' '}
                    <b>{title}</b>, {form.token} collateral, closes{' '}
                    <b>{closes}</b>.
                  </p>

                  <p className="ov-create__question">
                    What happens to {form.token} if {title} passes?
                  </p>

                  <div className="ov-create__definitions">
                    <div className="ov-create__definition ov-create__definition--pass">
                      <IconPassLine width={24} height={24} />
                      <div>
                        <strong>PASS</strong>
                        <span>{form.passCondition}</span>
                      </div>
                    </div>
                    <div className="ov-create__definition ov-create__definition--fail">
                      <IconFailLine width={24} height={24} />
                      <div>
                        <strong>FAIL</strong>
                        <span>{form.failCondition}</span>
                      </div>
                    </div>
                  </div>

                  <dl className="ov-create__review-list">
                    <div>
                      <dt>Initial liquidity</dt>
                      <dd>
                        {form.initialLiquidity} {form.token}
                      </dd>
                    </div>
                    <div>
                      <dt>Market fee</dt>
                      <dd>{form.fee}%</dd>
                    </div>
                    <div>
                      <dt>Closes</dt>
                      <dd>{closes}</dd>
                    </div>
                    <div>
                      <dt>Resolves</dt>
                      <dd>{resolves}</dd>
                    </div>
                    <div>
                      <dt>Resolution source</dt>
                      <dd>{form.resolutionSource}</dd>
                    </div>
                  </dl>

                  <p className="ov-create__confirmation">
                    Creating the market confirms that these definitions and
                    dates are ready for traders and the resolving oracle.
                  </p>

                  {prompted && (
                    <p className="ov-create__prompt" role="status">
                      <IconInfo width={16} height={16} />
                      <span>Connect a wallet to continue.</span>
                    </p>
                  )}

                  <a
                    className="ov-button ov-button--secondary ov-create__external"
                    href="https://app.seer.pm/create-market"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open on seer.pm
                    <IconExternal width={16} height={16} />
                  </a>
                </fieldset>
              )}
            </section>

            <footer className="ov-create__actions">
              <div className="ov-create__actions-left">
                {step > 0 && (
                  <button
                    type="button"
                    className="ov-button ov-button--secondary"
                    onClick={() =>
                      setStep(current => Math.max(0, current - 1))
                    }
                  >
                    <IconArrowLeft width={16} height={16} />
                    Back
                  </button>
                )}
                <button
                  type="button"
                  className="ov-button ov-button--ghost"
                  onClick={() => {
                    if (canLeave()) backToLanding();
                  }}
                >
                  Cancel
                </button>
              </div>

              <div className="ov-create__actions-right">
                <button
                  type="submit"
                  className="ov-button ov-button--primary"
                >
                  {step === 3 ? (
                    <>
                      <IconPlus width={16} height={16} />
                      Create market
                    </>
                  ) : (
                    <>
                      Save and continue
                      <IconArrowRight width={16} height={16} />
                    </>
                  )}
                </button>
              </div>
            </footer>
          </form>
        )}

        <aside className="ov-create__preview" aria-label="Preview">
          <h2>Preview</h2>
          <p className="ov-create__preview-label">
            Live question preview
          </p>
          <p className="ov-create__preview-meta">
            {orgName || 'Organization'} · {form.token}
          </p>

          <div className="ov-create__fork" aria-hidden="true">
            <IconFork width={48} height={48} />
          </div>

          <p className="ov-create__preview-question">
            What happens to {form.token} if {title} passes?
          </p>

          <div className="ov-create__preview-market ov-create__preview-market--pass">
            <IconPassLine width={24} height={24} />
            <div>
              <strong>PASS: If it passes</strong>
              <span>
                {form.metric.trim() || 'Success metric'} · {title}.{' '}
                {form.passCondition}
              </span>
            </div>
            <b>{form.token}</b>
          </div>

          <div className="ov-create__preview-market ov-create__preview-market--fail">
            <IconFailLine width={24} height={24} />
            <div>
              <strong>FAIL: If it fails</strong>
              <span>
                {form.metric.trim() || 'Success metric'} · {title}.{' '}
                {form.failCondition}
              </span>
            </div>
            <b>{form.token}</b>
          </div>

          <dl>
            <div>
              <dt>Closes</dt>
              <dd>{closes}</dd>
            </div>
            <div>
              <dt>Resolves</dt>
              <dd>{resolves}</dd>
            </div>
            <div>
              <dt>Collateral</dt>
              <dd>{form.token}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
