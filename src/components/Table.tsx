import type { ReactNode } from 'react'

type Column<T> = {
  key: keyof T
  header: string
  render?: (item: T) => ReactNode
}

type TableProps<T extends Record<string, unknown>> = {
  columns: Column<T>[]
  data: T[]
}

export function Table<T extends Record<string, unknown>>({ columns, data }: TableProps<T>) {
  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td key={String(column.key)}>
                  {column.render ? column.render(item) : String(item[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
