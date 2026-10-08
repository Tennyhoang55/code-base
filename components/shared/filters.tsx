export function FilterFields({
  branches,
  topics,
  date = true,
  values = {},
}: {
  branches?: { id: string; name: string }[];
  topics?: { id: string; code: string; title: string }[];
  date?: boolean;
  values?: {
    branch?: string;
    topic?: string;
    period?: string;
    from?: string;
    to?: string;
  };
}) {
  return (
    <>
      {branches && (
        <label>
          Chi nhánh
          <select name="branch" defaultValue={values.branch ?? ""}>
            <option value="">Tất cả chi nhánh</option>
            {branches.map((b) => (
              <option value={b.id} key={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {topics && (
        <label>
          Chủ đề
          <select name="topic" defaultValue={values.topic ?? ""}>
            <option value="">Tất cả chủ đề</option>
            <option value="mixed">Thi tổng hợp</option>
            {topics.map((t) => (
              <option value={t.id} key={t.id}>
                {t.code} · {t.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {date && (
        <>
          <label>
            Thời gian
            <select name="period" defaultValue={values.period ?? "all"}>
              <option value="all">Tất cả</option>
              <option value="month">Tháng này</option>
              <option value="custom">Khoảng tùy chọn</option>
            </select>
          </label>
          <label>
            Từ ngày
            <input type="date" name="from" defaultValue={values.from ?? ""} />
          </label>
          <label>
            Đến ngày
            <input type="date" name="to" defaultValue={values.to ?? ""} />
          </label>
        </>
      )}
    </>
  );
}
