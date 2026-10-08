function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function isEnabled(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['false', '0', 'no', 'single'].includes(normalized)) return false;
    if (['true', '1', 'yes', 'multi'].includes(normalized)) return true;
  }
  return Boolean(value);
}

function allowsMultipleClinics(
  record: Record<string, unknown>,
): boolean | null {
  const explicitFlags = [
    record.is_multiclinic,
    record.isMultiClinic,
    record.allow_multiple_clinics,
    record.allowMultipleClinics,
  ];
  for (const value of explicitFlags) {
    const enabled = isEnabled(value);
    if (enabled !== undefined) return enabled;
  }

  for (const value of [record.max_clinics, record.maxClinics]) {
    if (value !== undefined && Number(value) > 1) return true;
  }
  return null;
}

export function checkIsMultiClinicPlan(
  planData: unknown,
  userData: unknown,
  assignedClinics?: readonly unknown[],
): boolean {
  const plan = asRecord(planData);
  if (plan) {
    const result = allowsMultipleClinics(plan);
    if (result !== null) return result;
  }

  const user = asRecord(userData);
  if (user) {
    const result = allowsMultipleClinics(user);
    if (result !== null) return result;

    const nestedPlan = asRecord(user.plan);
    const planName = [
      user.plan_type,
      user.plan_name,
      user.subscription_plan,
      typeof user.plan === 'string' ? user.plan : undefined,
      nestedPlan?.name,
      nestedPlan?.type,
    ]
      .find(value => typeof value === 'string')
      ?.toString()
      .toLowerCase();

    if (
      planName?.includes('multi') ||
      planName?.includes('enterprise') ||
      planName?.includes('pro') ||
      planName?.includes('unlimited') ||
      planName?.includes('chain')
    ) {
      return true;
    }
    if (
      planName?.includes('single') ||
      planName?.includes('free') ||
      planName?.includes('basic') ||
      planName?.includes('starter') ||
      planName?.includes('individual')
    ) {
      return false;
    }
  }

  return (assignedClinics?.length || 0) > 1;
}
