type DisplayUser = {
  email: string;
  username?: string | null;
};


export function formatUsername(
  username?: string | null
) {
  return username
    ? `@${username}`
    : null;
}


export function getUserDisplayName(
  user: DisplayUser
) {
  return formatUsername(
    user.username
  ) ??
    user.email;
}


export function getUserSecondaryLabel(
  user: DisplayUser
) {
  return user.username
    ? user.email
    : null;
}


export function getUserInitials(
  user: DisplayUser
) {
  const source =
    user.username ??
    user.email.split(
      "@"
    )[0] ??
    user.email;

  return source
    .split(
      /[._-]+/
    )
    .filter(Boolean)
    .slice(
      0,
      2
    )
    .map(
      (part) =>
        part[0]?.toUpperCase()
    )
    .join(
      ""
    ) ||
    user.email[0]?.toUpperCase() ||
    "U";
}
