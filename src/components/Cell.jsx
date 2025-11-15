import { memo } from "preact/compat";

const Cell = memo(({ cell, onClick, status, isWinning, selectedPred }) => {
  const disabled = !!cell.disabled;
  let border = selectedPred? "border-blue-600" : "border-gray-700";
  let borderWinningDone = status === "done" && isWinning? "border-yellow-300 opacity-100" : status === "waiting"? "opacity-100" : "opacity-25";
  let labelColor = selectedPred? "text-blue-600" : "";
  // console.log("cell", cell)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      class={
        "flex flex-col box-content aspect-square text-xs md:text-sm lg:text-sm xl:text-base rounded-md border-2 enabled:hover:bg-surface-floatingHover enabled:hover:cursor-pointer enabled:hover:border-elements-highEmphasis/50 opacity-100 p-1 lg:p-2 disabled:hover:cursor-not-allowed disabled:opacity-50 transition-colors transition-opacity duration-300 "
        + border + " " + borderWinningDone 
      }
      aria-pressed={false}
      title={cell.label}
    >
      <div class="flex flex-row w-full justify-between">
        <span class={"mb-auto text-nowrap font-medium text-elements-lowEmphasis transition-colors duration-200 " + labelColor}>{cell.label}</span>
        <div class="flex flex-row hidden sm:flex gap-0 lg:gap-1 mb-auto font-medium text-elements-lowEmphasis">
          <span class="my-auto">{cell.count}</span>
          <svg viewBox="0 0 24 24" fill="currentColor" class="w-3 h-3 lg:w-4 lg:h-4 my-auto">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"></path>
          </svg>
        </div>
      </div>

      <div class="flex flex-col mt-auto ml-auto">
        <div class={`text-xs ${cell.percentage > (1/25 * 100)? "text-green-400" : "text-red-400"}`}>%{(cell.percentage).toFixed(2)}</div>
        {/* <span class="text-elements-highEmphasis ml-auto font-medium">{typeof cell.value === "number" ? cell.value.toFixed(4) : cell.value}</span> */}
      </div>
    </button>
  );
});

export default Cell;

