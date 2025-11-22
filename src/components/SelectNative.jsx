import { useState } from 'preact/hooks';

export default function SelectNative({ value: initial = '', onChange, options = [] }) {
  const [value, setValue] = useState(initial);

  const handleChange = (e) => {
    setValue(e.target.value);
    onChange?.(e.target.value);
  };

  return (
    <label class="block text-sm">
      <span class="block mb-1 text-gray-700 dark:text-gray-200">Select</span>

      <div class="relative">
        <select
          value={value}
          onChange={handleChange}
          class="
            w-full
            appearance-none                /* remove default arrow (for most browsers) */
            pr-10                          /* space for chevron */
            pl-3 py-2
            rounded-md
            border
            bg-white text-gray-900
            dark:bg-gray-800 dark:text-gray-100
            dark:border-gray-700
            border-gray-300
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            transition
          "
        >
          <option value="">-- Choose --</option>
          {options.map(opt => (
            <option value={opt.value} key={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Chevron (tidak menangkap klik) */}
        <div class="pointer-events-none absolute inset-y-0 right-2 flex items-center">
          <svg class="w-5 h-5 text-gray-500 dark:text-gray-300" viewBox="0 0 20 20" fill="none" stroke="currentColor">
            <path d="M6 8l4 4 4-4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
      </div>
    </label>
  );
}